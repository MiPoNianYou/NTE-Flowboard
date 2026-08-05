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
  type ChecklistStorageAdapter,
  type StoredChecklistSnapshot,
  EMPTY_CHECKLIST_REVISION,
} from './storage'
import {
  createRestoreSession,
  hasChecklistContentChanged,
  type ChecklistRestoreSession,
  type ChecklistRestoreSessionStore,
  type ChecklistRestoreState,
  type DiscardRestoreResult,
  type RestoreDefaultsResult,
  type UndoRestoreResult,
} from './checklistRestoreBackup'

type PersistenceStatus = 'saved' | 'pending' | 'error'

interface ChecklistSynchronizationResult {
  outcome: 'applied' | 'ignored' | 'merged'
  skippedOperations: number
}

export interface ChecklistPendingOperation {
  version: number
  transition: ChecklistTransition
}

export interface ChecklistSynchronizationPort {
  applyRemoteSnapshot: (data: ChecklistData) => Promise<ChecklistSynchronizationResult>
  captureSnapshot: () => {
    data: ChecklistData
    operationVersion: number
    operations: ChecklistPendingOperation[]
  }
  acknowledgeOperationsThrough: (operationVersion: number) => void
  restorePendingOperations: (operations: ChecklistPendingOperation[]) => void
}

export interface ChecklistControllerOptions {
  initialData: ChecklistData
  adapter: ChecklistStorageAdapter
  restoreStore?: ChecklistRestoreSessionStore
  createDefaultContent?: (now: Date) => ChecklistContentSnapshot
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
  getRestoreState: () => ChecklistRestoreState
  syncPort: ChecklistSynchronizationPort
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
  restoreDefaults: () => Promise<RestoreDefaultsResult>
  undoRestore: (overwrite?: boolean) => Promise<UndoRestoreResult>
  discardRestore: () => DiscardRestoreResult
  replaceData: (data: ChecklistData) => void
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

function replayOperations(data: ChecklistData, operations: ChecklistPendingOperation[]) {
  let merged = data
  let changed = false
  let skippedOperations = 0
  const retainedOperations: ChecklistPendingOperation[] = []

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
  restoreStore,
  createDefaultContent,
  now = () => new Date(),
  onConflict,
}: ChecklistControllerOptions): ChecklistController {
  let data = initialData
  let revision = EMPTY_CHECKLIST_REVISION
  let persistenceStatus: PersistenceStatus = 'saved'
  let persistenceError: string | null = null
  let stopped = false
  let started = false
  let lifecycleVersion = 0
  let needsPersist = false
  let operationVersion = 0
  let pendingOperations: ChecklistPendingOperation[] = []
  let unsubscribe: (() => void) | null = null
  let unsubscribeRestore: (() => void) | null = null
  let restoreSession: ChecklistRestoreSession | null = null
  let restoreState: ChecklistRestoreState = {
    sessionId: null,
    hasRestoreBackup: false,
    hasChangesSinceRestore: false,
  }
  const listeners = new Set<() => void>()

  const notify = () => listeners.forEach((listener) => listener())

  const refreshRestoreState = () => {
    const next: ChecklistRestoreState = {
      sessionId: restoreSession?.id ?? null,
      hasRestoreBackup: restoreSession !== null,
      hasChangesSinceRestore: restoreSession
        ? hasChecklistContentChanged(data, restoreSession.restored) &&
          hasChecklistContentChanged(data, restoreSession.before)
        : false,
    }
    const changed =
      next.sessionId !== restoreState.sessionId ||
      next.hasRestoreBackup !== restoreState.hasRestoreBackup ||
      next.hasChangesSinceRestore !== restoreState.hasChangesSinceRestore
    restoreState = changed ? next : restoreState
    return changed
  }

  const setRestoreSession = (session: ChecklistRestoreSession | null) => {
    restoreSession = session
    if (refreshRestoreState()) notify()
  }

  const setPersistence = (status: PersistenceStatus, error: string | null = null) => {
    persistenceStatus = status
    persistenceError = error
    notify()
  }

  const persist = async (snapshot: ChecklistData = data): Promise<void> => {
    if (stopped || !started) return
    setPersistence('pending', null)
    try {
      const saved = adapter.save(snapshot, revision)
      if (stopped) return
      revision = saved.revision
      if (data === snapshot) {
        needsPersist = false
        setPersistence('saved', null)
      } else setPersistence('pending', null)
    } catch (error: unknown) {
      if (stopped) return
      setPersistence('error', error instanceof Error ? error.message : String(error))
    }
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
    refreshRestoreState()
    notify()
    schedulePersist()
  }

  const mergeExternal = async (
    snapshot: StoredChecklistSnapshot,
    shouldPersist: boolean,
  ): Promise<ChecklistSynchronizationResult> => {
    if (!adapter.isNewer(snapshot.revision, revision))
      return { outcome: 'ignored', skippedOperations: 0 }
    const operations = pendingOperations
    const { merged, changed, retainedOperations, skippedOperations } = replayOperations(
      snapshot.data,
      operations,
    )
    pendingOperations = retainedOperations
    revision = snapshot.revision
    data = merged
    refreshRestoreState()
    notify()
    if (skippedOperations > 0) onConflict?.(skippedOperations)
    const didMerge = changed
    if (shouldPersist || didMerge) await persist(data)
    return {
      outcome: didMerge ? 'merged' : 'applied',
      skippedOperations,
    }
  }

  const mergeRemote = async (
    remoteData: ChecklistData,
  ): Promise<ChecklistSynchronizationResult> => {
    if (stopped) return { outcome: 'ignored', skippedOperations: 0 }

    const { merged, changed, retainedOperations, skippedOperations } = replayOperations(
      remoteData,
      pendingOperations,
    )
    pendingOperations = retainedOperations
    data = merged
    needsPersist = true
    refreshRestoreState()
    notify()
    if (skippedOperations > 0) onConflict?.(skippedOperations)
    await persist(data)
    return {
      outcome: changed ? 'merged' : 'applied',
      skippedOperations,
    }
  }

  const subscribeToExternalChanges = () => {
    if (unsubscribe) return
    unsubscribe = adapter.subscribe((snapshot) => {
      if (stopped || !adapter.isNewer(snapshot.revision, revision)) return
      void mergeExternal(snapshot, false)
    })
  }

  const subscribeToRestoreChanges = () => {
    if (!restoreStore || unsubscribeRestore) return
    unsubscribeRestore = restoreStore.subscribe(() => {
      if (!stopped) setRestoreSession(restoreStore.load())
    })
  }

  const synchronizeStoredChecklist = async () => {
    const snapshot = adapter.load().snapshot
    if (adapter.isNewer(snapshot.revision, revision)) {
      await mergeExternal(snapshot, false)
    }
  }

  const validateRestoreSession = (stored: ChecklistRestoreSession | null) => {
    if ((restoreSession?.id ?? null) === (stored?.id ?? null)) return true
    setRestoreSession(stored)
    return false
  }

  const restoreDefaults = async (): Promise<RestoreDefaultsResult> => {
    if (!restoreStore || !createDefaultContent) return 'backup-failed'
    await synchronizeStoredChecklist()

    const stored = restoreStore.load()
    if (!validateRestoreSession(stored)) return 'conflict'
    const timestamp = now()
    const restored = createDefaultContent(timestamp)
    const session = stored
      ? { ...stored, restored: structuredClone(restored), checklistRevision: revision }
      : createRestoreSession(data, restored, timestamp, revision)
    if (!restoreStore.save(session, stored?.id ?? null)) {
      setRestoreSession(restoreStore.load())
      return 'backup-failed'
    }

    setRestoreSession(session)
    apply({ kind: 'restore-checklist-content', snapshot: session.restored })
    await controller.flush()
    if (persistenceStatus !== 'saved') return 'persistence-failed'

    const persistedSession = { ...session, checklistRevision: revision }
    if (!restoreStore.save(persistedSession, session.id)) {
      setRestoreSession(restoreStore.load())
      return 'persistence-failed'
    }
    setRestoreSession(persistedSession)
    return 'success'
  }

  const undoRestore = async (overwrite = false): Promise<UndoRestoreResult> => {
    if (!restoreStore) return 'backup-missing'
    await synchronizeStoredChecklist()

    const session = restoreStore.load()
    if (!session) {
      setRestoreSession(null)
      return 'backup-missing'
    }
    if (!validateRestoreSession(session)) return 'conflict'
    if (session.checklistRevision && adapter.isNewer(session.checklistRevision, revision)) {
      return 'conflict'
    }

    const isAlreadyUndone = !hasChecklistContentChanged(data, session.before)
    const hasPostRestoreChanges =
      hasChecklistContentChanged(data, session.restored) && !isAlreadyUndone
    if (hasPostRestoreChanges && !overwrite) return 'changes-detected'
    if (restoreStore.load()?.id !== session.id) {
      setRestoreSession(restoreStore.load())
      return 'conflict'
    }

    if (!isAlreadyUndone) {
      apply({ kind: 'restore-checklist-content', snapshot: session.before })
      await controller.flush()
      if (persistenceStatus !== 'saved') return 'persistence-failed'
    }

    const cleared = restoreStore.clear(session.id)
    if (cleared === 'conflict' || cleared === 'missing') {
      setRestoreSession(restoreStore.load())
      return 'conflict'
    }
    if (cleared === 'failed') return 'cleanup-failed'
    setRestoreSession(null)
    return 'success'
  }

  const discardRestore = (): DiscardRestoreResult => {
    if (!restoreStore) return 'backup-missing'
    const session = restoreStore.load()
    if (!session) {
      setRestoreSession(null)
      return 'backup-missing'
    }
    if (!validateRestoreSession(session)) return 'conflict'
    const cleared = restoreStore.clear(session.id)
    if (cleared === 'conflict') {
      setRestoreSession(restoreStore.load())
      return 'conflict'
    }
    if (cleared === 'missing') {
      setRestoreSession(null)
      return 'backup-missing'
    }
    if (cleared === 'failed') return 'cleanup-failed'
    setRestoreSession(null)
    return 'success'
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
      subscribeToExternalChanges()
      subscribeToRestoreChanges()
      setRestoreSession(restoreStore?.load() ?? null)
      try {
        const snapshot = adapter.load().snapshot
        if (stopped || version !== lifecycleVersion) return
        if (adapter.isNewer(snapshot.revision, revision)) {
          revision = snapshot.revision
          const operations = pendingOperations
          const { merged, retainedOperations, skippedOperations } = replayOperations(
            snapshot.data,
            operations,
          )
          pendingOperations = retainedOperations
          data = merged
          needsPersist = merged !== snapshot.data
          refreshRestoreState()
          if (skippedOperations > 0) onConflict?.(skippedOperations)
          notify()
        }
      } catch (error: unknown) {
        if (!stopped)
          setPersistence('error', error instanceof Error ? error.message : String(error))
      } finally {
        if (version === lifecycleVersion) {
          if (!stopped && (needsPersist || persistenceStatus !== 'saved')) await persist(data)
        }
      }
    },
    stop: () => {
      stopped = true
      started = false
      lifecycleVersion += 1
      listeners.clear()
      unsubscribe?.()
      unsubscribe = null
      unsubscribeRestore?.()
      unsubscribeRestore = null
    },
    flush: async () => {
      if (stopped) return
      if (!stopped && persistenceStatus !== 'saved') await persist(data)
    },
    flushNow: () => {
      if (!stopped) adapter.flush(data, revision)
    },
    getPersistenceStatus: () => persistenceStatus,
    getPersistenceError: () => persistenceError,
    getRestoreState: () => restoreState,
    syncPort: {
      applyRemoteSnapshot: mergeRemote,
      captureSnapshot: () => ({
        data,
        operationVersion,
        operations: structuredClone(pendingOperations),
      }),
      acknowledgeOperationsThrough: (acknowledgedVersion) => {
        pendingOperations = pendingOperations.filter(
          (operation) => operation.version > acknowledgedVersion,
        )
      },
      restorePendingOperations: (operations) => {
        if (operations.length === 0) return
        const restored = structuredClone(operations)
        const operationKey = (operation: ChecklistPendingOperation) =>
          `${operation.version}:${JSON.stringify(operation.transition)}`
        const existingKeys = new Set(pendingOperations.map(operationKey))
        const missingRestored = restored.filter(
          (operation) => !existingKeys.has(operationKey(operation)),
        )
        if (missingRestored.length === 0) {
          operationVersion = Math.max(
            operationVersion,
            ...restored.map((operation) => operation.version),
          )
          return
        }
        const restoredMax = Math.max(...restored.map((operation) => operation.version), 0)
        const restoredKeys = new Set(restored.map(operationKey))
        const current = pendingOperations
          .filter((operation) => !restoredKeys.has(operationKey(operation)))
          .map((operation, index) => ({
            ...operation,
            version: restoredMax + index + 1,
          }))
        pendingOperations = [...restored, ...current]
        operationVersion = Math.max(operationVersion, restoredMax + current.length)
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
    restoreDefaults,
    undoRestore,
    discardRestore,
    replaceData: (nextData) => {
      apply({ kind: 'replace-data', data: nextData })
    },
  }

  return controller
}
