import { describe, expect, it, vi } from 'vitest'
import type { ChecklistContentSnapshot, ChecklistData } from '../../src/types'
import {
  createChecklistController,
  type ChecklistController,
} from '../../src/utils/checklistController'
import type { ChecklistStorageAdapter, StoredChecklistSnapshot } from '../../src/utils/storage'
import {
  createChecklistStorageAdapter,
  EMPTY_CHECKLIST_REVISION,
  type ChecklistRevision,
} from '../../src/utils/storage'
import type {
  ChecklistRestoreSession,
  ChecklistRestoreSessionStore,
  RestoreSessionClearResult,
} from '../../src/utils/checklistRestoreBackup'

const data = (): ChecklistData => ({
  daily: [{ id: 'a', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] }],
  weekly: [],
  monthly: [],
  lastDailyReset: '2026-01-01T00:00:00.000Z',
  lastWeeklyReset: '2026-01-01T00:00:00.000Z',
  lastMonthlyReset: '2026-01-01T00:00:00.000Z',
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
})

function adapter(snapshot: StoredChecklistSnapshot | null): ChecklistStorageAdapter {
  const listeners = new Set<(snapshot: StoredChecklistSnapshot) => void>()
  const compare = (left: ChecklistRevision, right: ChecklistRevision) =>
    Number(left.split(':', 1)[0]) - Number(right.split(':', 1)[0])
  const save = vi.fn((nextData: ChecklistData, knownRevision: ChecklistRevision) => {
    snapshot = {
      data: nextData,
      revision: `${Number(knownRevision.split(':', 1)[0]) + 1}:test` as ChecklistRevision,
    }
    return snapshot
  })
  return {
    load: vi.fn(() => ({
      status: snapshot ? ('loaded' as const) : ('defaulted' as const),
      snapshot: snapshot ?? { data: data(), revision: EMPTY_CHECKLIST_REVISION },
      error: null,
    })),
    save,
    flush: save,
    isNewer: (candidate, current) => compare(candidate, current) > 0,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function revision(counter: number, writerId: string): ChecklistRevision {
  return `${counter}:${writerId}` as ChecklistRevision
}

function makeController(storage: ChecklistStorageAdapter): ChecklistController {
  return createChecklistController({ initialData: data(), adapter: storage })
}

function restoredContent(): ChecklistContentSnapshot {
  return {
    daily: [{ ...data().daily[0], id: 'restored', text: 'Restored default' }],
    weekly: [],
    monthly: [],
    lastDailyReset: '2026-07-29T12:00:00.000Z',
    lastWeeklyReset: '2026-07-29T12:00:00.000Z',
    lastMonthlyReset: '2026-07-29T12:00:00.000Z',
  }
}

function createRestoreStore() {
  let session: ChecklistRestoreSession | null = null
  let failSave = false
  let failClear = false
  const listeners = new Set<() => void>()
  const store: ChecklistRestoreSessionStore = {
    load: () => session,
    save: (next, expectedSessionId) => {
      if (failSave || (session?.id ?? null) !== expectedSessionId) return false
      session = structuredClone(next)
      return true
    },
    clear: (expectedSessionId): RestoreSessionClearResult => {
      if (failClear) return 'failed'
      if (!session) return 'missing'
      if (session.id !== expectedSessionId) return 'conflict'
      session = null
      return 'success'
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    store,
    setFailSave: (value: boolean) => {
      failSave = value
    },
    setFailClear: (value: boolean) => {
      failClear = value
    },
    replaceSilently: (next: ChecklistRestoreSession | null) => {
      session = next
    },
  }
}

function makeRestoreController(storage: ChecklistStorageAdapter, restore = createRestoreStore()) {
  return {
    controller: createChecklistController({
      initialData: data(),
      adapter: storage,
      restoreStore: restore.store,
      createDefaultContent: restoredContent,
      now: () => new Date('2026-07-29T12:00:00.000Z'),
    }),
    restore,
  }
}

describe('createChecklistController', () => {
  it('replays local operations over the synchronous start snapshot', async () => {
    const remote = data()
    remote.daily[0].isCompleted = true
    const storage = adapter({ data: remote, revision: revision(2, 'remote') })
    const controller = makeController(storage)

    controller.toggleItem('daily', 'a')
    await controller.start()

    expect(controller.getSnapshot().daily[0].isCompleted).toBe(true)
  })

  it('skips operations for remote-deleted items and reports one conflict', async () => {
    const onConflict = vi.fn()
    const storage = adapter({
      data: { ...data(), daily: [] },
      revision: revision(2, 'remote'),
    })
    const controller = createChecklistController({
      initialData: data(),
      adapter: storage,
      onConflict,
    })

    controller.editItem('daily', 'a', 'local', [])
    await controller.start()

    expect(controller.getSnapshot().daily).toEqual([])
    expect(onConflict).toHaveBeenCalledWith(1)
  })

  it('replays a full local replacement made before hydration', async () => {
    const remote = data()
    remote.daily[0].text = 'remote'
    const storage = adapter({ data: remote, revision: revision(2, 'remote') })
    const controller = makeController(storage)
    const replacement = { ...data(), daily: [{ ...data().daily[0], text: 'imported' }] }

    controller.replaceData(replacement)
    await controller.start()

    expect(controller.getSnapshot().daily[0].text).toBe('imported')
    expect(storage.save).toHaveBeenCalled()
  })

  it('can restart after a development-mode cleanup cycle', async () => {
    const storage = adapter(null)
    const unsubscribe = vi.fn()
    storage.subscribe = vi.fn(() => unsubscribe)
    const controller = makeController(storage)

    await controller.start()
    controller.stop()
    await controller.start()
    controller.editItem('daily', 'a', 'after restart', [])
    await controller.flush()

    expect(storage.save).toHaveBeenCalled()
    expect(storage.subscribe).toHaveBeenCalledTimes(2)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot().daily[0].text).toBe('after restart')
  })

  it('persists a change through the real local storage adapter', async () => {
    const storage = createChecklistStorageAdapter()
    const controller = makeController(storage)
    await controller.start()

    controller.addItem('daily', {
      id: 'persisted',
      text: 'Persisted task',
      isCompleted: false,
      isHidden: false,
      order: 0,
      tags: [],
    })
    await controller.flush()

    const reloaded = createChecklistController({
      initialData: data(),
      adapter: createChecklistStorageAdapter(),
    })
    await reloaded.start()

    expect(reloaded.getSnapshot().daily.some((item) => item.id === 'persisted')).toBe(true)
  })

  it('replays locally saved operations over a newer external snapshot', async () => {
    const storage = adapter(null)
    const controller = makeController(storage)
    await controller.start()
    controller.editItem('daily', 'a', 'local edit', [])
    await controller.flush()

    const result = await controller.syncPort.applyRemoteSnapshot({
      ...data(),
      daily: [{ ...data().daily[0], text: 'remote edit' }],
    })

    expect(result.outcome).toBe('merged')
    expect(controller.getSnapshot().daily[0].text).toBe('local edit')
  })

  it('owns the restore transaction and preserves settings', async () => {
    const storage = adapter(null)
    const { controller } = makeRestoreController(storage)
    await controller.start()
    controller.updateSettings({ serverRegion: 'europe' })

    expect(await controller.restoreDefaults()).toBe('success')

    expect(controller.getSnapshot().daily).toEqual(restoredContent().daily)
    expect(controller.getSnapshot().settings.serverRegion).toBe('europe')
    expect(controller.getRestoreState()).toMatchObject({
      hasRestoreBackup: true,
      hasChangesSinceRestore: false,
    })
    expect(controller.syncPort.captureSnapshot().operationVersion).toBeGreaterThan(0)
  })

  it('keeps the original checkpoint across repeated restores', async () => {
    const storage = adapter(null)
    const { controller } = makeRestoreController(storage)
    await controller.start()
    controller.editItem('daily', 'a', 'Original checkpoint', [])
    await controller.flush()

    expect(await controller.restoreDefaults()).toBe('success')
    controller.addItem('daily', {
      id: 'after-restore',
      text: 'Later edit',
      isCompleted: false,
      isHidden: false,
      order: 2,
      tags: [],
    })
    expect(await controller.restoreDefaults()).toBe('success')
    expect(await controller.undoRestore()).toBe('success')

    expect(controller.getSnapshot().daily[0].text).toBe('Original checkpoint')
  })

  it('refuses to overwrite post-restore edits unless explicitly requested', async () => {
    const storage = adapter(null)
    const { controller } = makeRestoreController(storage)
    await controller.start()
    expect(await controller.restoreDefaults()).toBe('success')
    controller.addItem('daily', {
      id: 'after-restore',
      text: 'Later edit',
      isCompleted: false,
      isHidden: false,
      order: 2,
      tags: [],
    })

    expect(await controller.undoRestore()).toBe('changes-detected')
    expect(controller.getSnapshot().daily.some((item) => item.id === 'after-restore')).toBe(true)
    expect(await controller.undoRestore(true)).toBe('success')
    expect(controller.getSnapshot()).toEqual(data())
  })

  it('keeps a restore session available when persistence or cleanup fails', async () => {
    const storage = adapter(null)
    const save = vi.mocked(storage.save)
    const saveImplementation = save.getMockImplementation()!
    let failWrites = true
    save.mockImplementation((...args) => {
      if (failWrites) throw new Error('disk full')
      return saveImplementation(...args)
    })
    const { controller, restore } = makeRestoreController(storage)
    await controller.start()

    expect(await controller.restoreDefaults()).toBe('persistence-failed')
    expect(controller.getRestoreState().hasRestoreBackup).toBe(true)
    failWrites = false
    expect(await controller.restoreDefaults()).toBe('success')
    restore.setFailClear(true)
    expect(await controller.undoRestore()).toBe('cleanup-failed')
    expect(controller.getSnapshot()).toEqual(data())
    expect(controller.getRestoreState().hasRestoreBackup).toBe(true)
    restore.setFailClear(false)
    expect(await controller.undoRestore()).toBe('success')
  })

  it('discards the restore session without changing checklist data', async () => {
    const storage = adapter(null)
    const { controller } = makeRestoreController(storage)
    await controller.start()
    await controller.restoreDefaults()
    const restored = controller.getSnapshot()

    expect(controller.discardRestore()).toBe('success')
    expect(controller.getSnapshot()).toBe(restored)
    expect(controller.getRestoreState().hasRestoreBackup).toBe(false)
  })

  it('rejects an undo when another tab has replaced the restore session', async () => {
    const storage = adapter(null)
    const { controller, restore } = makeRestoreController(storage)
    await controller.start()
    await controller.restoreDefaults()
    const current = restore.store.load()!
    restore.replaceSilently({ ...current, id: 'other-tab-session' })

    expect(await controller.undoRestore()).toBe('conflict')
    expect(controller.getSnapshot().daily).toEqual(restoredContent().daily)
    expect(controller.getRestoreState().sessionId).toBe('other-tab-session')
  })

  it('replays restore and undo transactions over newer cloud data', async () => {
    const storage = adapter(null)
    const { controller } = makeRestoreController(storage)
    await controller.start()
    await controller.restoreDefaults()
    const restoredVersion = controller.syncPort.captureSnapshot().operationVersion
    const restoreMerge = await controller.syncPort.applyRemoteSnapshot({
      ...data(),
      daily: [{ ...data().daily[0], text: 'Cloud edit' }],
    })
    expect(restoreMerge.outcome).toBe('merged')
    expect(controller.getSnapshot().daily).toEqual(restoredContent().daily)

    controller.syncPort.acknowledgeOperationsThrough(restoredVersion)
    await controller.undoRestore()
    const undoMerge = await controller.syncPort.applyRemoteSnapshot({
      ...data(),
      ...restoredContent(),
    })
    expect(undoMerge.outcome).toBe('merged')
    expect(controller.getSnapshot()).toEqual(data())
  })

  it('does not persist an unchanged external snapshot back to storage', async () => {
    let onExternalSnapshot: ((snapshot: StoredChecklistSnapshot) => void) | undefined
    const storage = adapter({ data: data(), revision: revision(1, 'remote') })
    storage.subscribe = vi.fn((listener) => {
      onExternalSnapshot = listener
      return () => undefined
    })
    const controller = makeController(storage)
    await controller.start()
    vi.mocked(storage.save).mockClear()

    onExternalSnapshot?.({ data: data(), revision: revision(2, 'remote') })
    await Promise.resolve()
    await Promise.resolve()

    expect(storage.save).not.toHaveBeenCalled()
  })

  it('does not duplicate an add operation already present in an external snapshot', async () => {
    const storage = adapter(null)
    const controller = makeController(storage)
    await controller.start()
    controller.addItem('daily', {
      id: 'existing',
      text: 'same task',
      isCompleted: false,
      isHidden: false,
      order: 0,
      tags: [],
    })

    await controller.syncPort.applyRemoteSnapshot({
      ...data(),
      daily: [{ ...data().daily[0], id: 'existing', text: 'same task' }],
    })

    expect(controller.getSnapshot().daily.filter((item) => item.id === 'existing')).toHaveLength(1)
  })
})
