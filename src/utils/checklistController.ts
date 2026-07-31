import type {
  BehaviorSettings,
  ChecklistData,
  ChecklistContentSnapshot,
  ChecklistItem,
  ChecklistTransition,
  TabType,
  UiPreferences,
} from '../types'
import { applyChecklistTransition } from './checklistTransitions'
import {
  type ChecklistRevision,
  type ChecklistStorageAdapter,
  type StoredChecklistSnapshot,
  compareChecklistRevisions,
} from './storage'

type PersistenceStatus = 'saved' | 'pending' | 'error'

interface ExternalSnapshotResult {
  outcome: 'applied' | 'ignored' | 'merged'
  skippedOperations: number
}

export interface ChecklistControllerOptions {
  initialData: ChecklistData
  adapter: ChecklistStorageAdapter
  now?: () => Date
  onConflict?: (skippedOperations: number) => void
}

export interface ChecklistController {
  getSnapshot: () => ChecklistData
  subscribe: (listener: () => void) => () => void
  start: () => Promise<void>
  stop: () => void
  flush: () => Promise<void>
  flushNow: () => void
  getPersistenceStatus: () => PersistenceStatus
  getPersistenceError: () => string | null
  syncPort: {
    applyExternalSnapshot: (snapshot: StoredChecklistSnapshot) => Promise<ExternalSnapshotResult>
    captureSnapshot: () => { data: ChecklistData; operationVersion: number }
    acknowledgeOperationsThrough: (operationVersion: number) => void
  }
  updateSettings: (partial: Partial<BehaviorSettings>) => void
  updateUiPreferences: (partial: Partial<UiPreferences>) => void
  toggleItem: (tab: TabType, id: string) => void
  addItem: (tab: TabType, item: ChecklistItem) => void
  editItem: (tab: TabType, id: string, text: string, tags: string[]) => void
  removeItem: (tab: TabType, id: string) => void
  setItemHidden: (tab: TabType, id: string, isHidden: boolean) => void
  reorderItem: (tab: TabType, activeId: string, overId: string) => void
  manualReset: (tab: TabType, now: Date) => void
  applyDueResets: (now: Date) => void
  restoreChecklistContent: (snapshot: ChecklistContentSnapshot) => void
  replaceData: (data: ChecklistData) => void
}

const EMPTY_REVISION: ChecklistRevision = { counter: 0, writerId: '' }

interface PendingOperation {
  version: number
  transition: ChecklistTransition
}

interface PendingExternalSnapshot {
  snapshot: StoredChecklistSnapshot
  shouldPersist: boolean
}

function operationTargetsMissing(data: ChecklistData, transition: ChecklistTransition): boolean {
  if (transition.kind === 'add-item') {
    const existing = data[transition.cycle].find((item) => item.id === transition.item.id)
    return Boolean(existing && JSON.stringify(existing) !== JSON.stringify(transition.item))
  }
  if (
    transition.kind === 'update-settings' ||
    transition.kind === 'update-ui-preferences' ||
    transition.kind === 'apply-due-resets' ||
    transition.kind === 'manual-reset' ||
    transition.kind === 'restore-checklist-content' ||
    transition.kind === 'replace-data'
  ) {
    return false
  }
  const cycle = transition.cycle
  const items = data[cycle]
  if (transition.kind === 'reorder-item') {
    return (
      !items.some((item) => item.id === transition.activeId) ||
      !items.some((item) => item.id === transition.overId)
    )
  }
  return !items.some((item) => item.id === transition.id)
}

function replayOperations(data: ChecklistData, operations: PendingOperation[]) {
  let merged = data
  let changed = false
  let skippedOperations = 0
  const retainedOperations: PendingOperation[] = []

  for (const operation of operations) {
    const transition = operation.transition
    if (operationTargetsMissing(merged, transition)) {
      skippedOperations += 1
      continue
    }
    if (transition.kind === 'add-item') {
      const existing = merged[transition.cycle].find((item) => item.id === transition.item.id)
      if (existing) continue
    }
    const next = applyChecklistTransition(merged, transition)
    if (next === merged) continue
    merged = next
    changed = true
    retainedOperations.push(operation)
  }

  return { merged, changed, retainedOperations, skippedOperations }
}

export function createChecklistController({
  initialData,
  adapter,
  now = () => new Date(),
  onConflict,
}: ChecklistControllerOptions): ChecklistController {
  let data = initialData
  let revision = EMPTY_REVISION
  let persistenceStatus: PersistenceStatus = 'saved'
  let persistenceError: string | null = null
  let stopped = false
  let started = false
  let lifecycleVersion = 0
  let hydrating = true
  let needsPersist = false
  let operationVersion = 0
  let savePromise: Promise<void> | null = null
  let pendingExternal: PendingExternalSnapshot | null = null
  let pendingOperations: PendingOperation[] = []
  let unsubscribe: (() => void) | null = null
  const listeners = new Set<() => void>()

  const notify = () => listeners.forEach((listener) => listener())

  const setPersistence = (status: PersistenceStatus, error: string | null = null) => {
    persistenceStatus = status
    persistenceError = error
    notify()
  }

  const persist = async (snapshot: ChecklistData = data): Promise<void> => {
    if (stopped) return
    if (hydrating) return
    setPersistence('pending', null)
    const task = adapter
      .save(snapshot, revision)
      .then((saved) => {
        if (stopped) return
        revision = saved.revision
        if (data === snapshot) {
          needsPersist = false
          setPersistence('saved', null)
        } else setPersistence('pending', null)
      })
      .catch((error: unknown) => {
        if (stopped) return
        setPersistence('error', error instanceof Error ? error.message : String(error))
      })
    savePromise = task
    await task
    if (savePromise === task) savePromise = null
    if (!stopped && data !== snapshot && persistenceStatus !== 'error') await persist(data)
  }

  const schedulePersist = () => {
    void persist(data)
  }

  const apply = (transition: ChecklistTransition, queue = true) => {
    const next = applyChecklistTransition(data, transition)
    if (next === data) return
    data = next
    if (queue) {
      operationVersion += 1
      pendingOperations.push({ version: operationVersion, transition })
    }
    needsPersist = true
    notify()
    schedulePersist()
  }

  const mergeExternal = async (
    snapshot: StoredChecklistSnapshot,
    shouldPersist: boolean,
  ): Promise<ExternalSnapshotResult> => {
    if (compareChecklistRevisions(snapshot.revision, revision) <= 0)
      return { outcome: 'ignored', skippedOperations: 0 }
    if (hydrating) {
      if (
        !pendingExternal ||
        compareChecklistRevisions(snapshot.revision, pendingExternal.snapshot.revision) > 0
      ) {
        pendingExternal = { snapshot, shouldPersist }
      }
      return { outcome: 'ignored', skippedOperations: 0 }
    }

    const operations = pendingOperations
    const { merged, changed, retainedOperations, skippedOperations } = replayOperations(
      snapshot.data,
      operations,
    )
    pendingOperations = retainedOperations
    revision = snapshot.revision
    data = merged
    notify()
    if (skippedOperations > 0) onConflict?.(skippedOperations)
    const didMerge = changed
    if (shouldPersist || didMerge) await persist(data)
    return {
      outcome: didMerge ? 'merged' : 'applied',
      skippedOperations,
    }
  }

  const subscribeToExternalChanges = () => {
    if (unsubscribe) return
    unsubscribe = adapter.subscribe((externalRevision) => {
      if (stopped || compareChecklistRevisions(externalRevision, revision) <= 0) return
      void adapter.read().then((snapshot) => {
        if (!stopped && snapshot) void mergeExternal(snapshot, false)
      })
    })
  }

  const controller: ChecklistController = {
    getSnapshot: () => data,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: async () => {
      if (started) return
      stopped = false
      const version = ++lifecycleVersion
      started = true
      hydrating = true
      subscribeToExternalChanges()
      try {
        const snapshot = await adapter.read()
        if (stopped || version !== lifecycleVersion) return
        if (snapshot && compareChecklistRevisions(snapshot.revision, revision) > 0) {
          revision = snapshot.revision
          const operations = pendingOperations
          const { merged, retainedOperations, skippedOperations } = replayOperations(
            snapshot.data,
            operations,
          )
          pendingOperations = retainedOperations
          data = merged
          needsPersist = merged !== snapshot.data
          if (skippedOperations > 0) onConflict?.(skippedOperations)
          notify()
        }
      } catch (error: unknown) {
        if (!stopped)
          setPersistence('error', error instanceof Error ? error.message : String(error))
      } finally {
        if (version === lifecycleVersion) {
          hydrating = false
          if (!stopped && (needsPersist || persistenceStatus !== 'saved')) await persist(data)
          if (pendingExternal && !stopped) {
            const next = pendingExternal
            pendingExternal = null
            await mergeExternal(next.snapshot, next.shouldPersist)
          }
        }
      }
    },
    stop: () => {
      stopped = true
      started = false
      lifecycleVersion += 1
      hydrating = false
      pendingExternal = null
      listeners.clear()
      unsubscribe?.()
      unsubscribe = null
    },
    flush: async () => {
      if (stopped) return
      if (savePromise) await savePromise
      if (!stopped && persistenceStatus !== 'saved') await persist(data)
    },
    flushNow: () => {
      if (!stopped) adapter.flushNow(data, revision)
    },
    getPersistenceStatus: () => persistenceStatus,
    getPersistenceError: () => persistenceError,
    syncPort: {
      applyExternalSnapshot: (snapshot) => mergeExternal(snapshot, true),
      captureSnapshot: () => ({ data, operationVersion }),
      acknowledgeOperationsThrough: (acknowledgedVersion) => {
        pendingOperations = pendingOperations.filter(
          (operation) => operation.version > acknowledgedVersion,
        )
      },
    },
    updateSettings: (partial) => apply({ kind: 'update-settings', partial }),
    updateUiPreferences: (partial) => apply({ kind: 'update-ui-preferences', partial }),
    toggleItem: (tab, id) => {
      const item = data[tab].find((candidate) => candidate.id === id)
      if (item)
        apply({ kind: 'set-item-completed', cycle: tab, id, isCompleted: !item.isCompleted })
    },
    addItem: (tab, item) => apply({ kind: 'add-item', cycle: tab, item }),
    editItem: (tab, id, text, tags) => apply({ kind: 'edit-item', cycle: tab, id, text, tags }),
    removeItem: (tab, id) => apply({ kind: 'remove-item', cycle: tab, id }),
    setItemHidden: (tab, id, isHidden) =>
      apply({ kind: 'set-item-hidden', cycle: tab, id, isHidden }),
    reorderItem: (tab, activeId, overId) =>
      apply({ kind: 'reorder-item', cycle: tab, activeId, overId }),
    manualReset: (tab, timestamp = now()) =>
      apply({ kind: 'manual-reset', cycle: tab, now: timestamp }),
    applyDueResets: (timestamp = now()) => apply({ kind: 'apply-due-resets', now: timestamp }),
    restoreChecklistContent: (snapshot) => apply({ kind: 'restore-checklist-content', snapshot }),
    replaceData: (nextData) => {
      apply({ kind: 'replace-data', data: nextData })
    },
  }

  return controller
}
