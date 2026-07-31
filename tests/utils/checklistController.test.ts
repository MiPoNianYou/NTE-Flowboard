import { describe, expect, it, vi } from 'vitest'
import type { ChecklistContentSnapshot, ChecklistData } from '../../src/types'
import {
  createChecklistController,
  type ChecklistController,
} from '../../src/utils/checklistController'
import type { ChecklistStorageAdapter, StoredChecklistSnapshot } from '../../src/utils/storage'
import { createChecklistStorageAdapter } from '../../src/utils/storage'

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
  const listeners = new Set<(revision: StoredChecklistSnapshot['revision']) => void>()
  return {
    read: vi.fn(async () => snapshot),
    save: vi.fn(async (nextData, knownRevision) => {
      snapshot = {
        data: nextData,
        revision: { counter: knownRevision.counter + 1, writerId: 'test' },
      }
      return snapshot
    }),
    flushNow: vi.fn(),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function makeController(storage: ChecklistStorageAdapter): ChecklistController {
  return createChecklistController({ initialData: data(), adapter: storage })
}

describe('createChecklistController', () => {
  it('replays local operations after hydrate and uses target completion state', async () => {
    const remote = data()
    remote.daily[0].isCompleted = true
    const storage = adapter({ data: remote, revision: { counter: 2, writerId: 'remote' } })
    const controller = makeController(storage)

    controller.toggleItem('daily', 'a')
    await controller.start()

    expect(controller.getSnapshot().daily[0].isCompleted).toBe(true)
  })

  it('skips operations for remote-deleted items and reports one conflict', async () => {
    const onConflict = vi.fn()
    const storage = adapter({
      data: { ...data(), daily: [] },
      revision: { counter: 2, writerId: 'remote' },
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

  it('ignores an older external snapshot', async () => {
    const storage = adapter(null)
    const controller = makeController(storage)
    controller.replaceData({ ...data(), daily: [] })
    await controller.syncPort.applyExternalSnapshot({
      data: data(),
      revision: { counter: 0, writerId: 'old' },
    })

    expect(controller.getSnapshot().daily).toEqual([])
  })

  it('does not apply a late hydrate result after stop', async () => {
    let resolveRead: ((value: StoredChecklistSnapshot) => void) | undefined
    const storage = adapter(null)
    storage.read = vi.fn<() => Promise<StoredChecklistSnapshot | null>>(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve
        }),
    )
    const controller = makeController(storage)
    const start = controller.start()
    controller.stop()
    resolveRead?.({ data: { ...data(), daily: [] }, revision: { counter: 1, writerId: 'remote' } })
    await start

    expect(controller.getSnapshot().daily).toHaveLength(1)
  })

  it('persists local changes made before hydration completes', async () => {
    let resolveRead: ((value: StoredChecklistSnapshot | null) => void) | undefined
    const storage = adapter(null)
    storage.read = vi.fn(
      () =>
        new Promise<StoredChecklistSnapshot | null>((resolve) => {
          resolveRead = resolve
        }),
    )
    const controller = makeController(storage)
    controller.editItem('daily', 'a', 'edited before hydrate', [])

    const start = controller.start()
    resolveRead?.(null)
    await start

    expect(controller.getSnapshot().daily[0].text).toBe('edited before hydrate')
    expect(storage.save).toHaveBeenCalledWith(
      expect.objectContaining({ daily: expect.any(Array) }),
      expect.any(Object),
    )
  })

  it('replays a full local replacement made before hydration', async () => {
    const remote = data()
    remote.daily[0].text = 'remote'
    const storage = adapter({ data: remote, revision: { counter: 2, writerId: 'remote' } })
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

    const result = await controller.syncPort.applyExternalSnapshot({
      data: { ...data(), daily: [{ ...data().daily[0], text: 'remote edit' }] },
      revision: { counter: 99, writerId: 'remote' },
    })

    expect(result.outcome).toBe('merged')
    expect(controller.getSnapshot().daily[0].text).toBe('local edit')
  })

  it('captures and replays a restore snapshot over newer cloud data', async () => {
    const storage = adapter(null)
    const controller = makeController(storage)
    await controller.start()
    const restored: ChecklistContentSnapshot = {
      daily: [{ ...data().daily[0], id: 'restored', text: 'Restored default' }],
      weekly: [],
      monthly: [],
      lastDailyReset: '2026-07-29T12:00:00.000Z',
      lastWeeklyReset: '2026-07-29T12:00:00.000Z',
      lastMonthlyReset: '2026-07-29T12:00:00.000Z',
    }

    controller.restoreChecklistContent(restored)
    const captured = controller.syncPort.captureSnapshot()
    const result = await controller.syncPort.applyExternalSnapshot({
      data: { ...data(), daily: [{ ...data().daily[0], text: 'Cloud edit' }] },
      revision: { counter: 99, writerId: 'remote' },
    })

    expect(captured.data.daily).toEqual(restored.daily)
    expect(captured.operationVersion).toBeGreaterThan(0)
    expect(result.outcome).toBe('merged')
    expect(controller.getSnapshot()).toEqual({ ...data(), ...restored })
  })

  it('captures and replays an undo snapshot over newer cloud data', async () => {
    const storage = adapter(null)
    const controller = makeController(storage)
    await controller.start()
    const before = controller.getSnapshot()
    const restored: ChecklistContentSnapshot = {
      daily: [{ ...before.daily[0], id: 'restored', text: 'Restored default' }],
      weekly: [],
      monthly: [],
      lastDailyReset: '2026-07-29T12:00:00.000Z',
      lastWeeklyReset: '2026-07-29T12:00:00.000Z',
      lastMonthlyReset: '2026-07-29T12:00:00.000Z',
    }
    const undoSnapshot: ChecklistContentSnapshot = {
      daily: before.daily,
      weekly: before.weekly,
      monthly: before.monthly,
      lastDailyReset: before.lastDailyReset,
      lastWeeklyReset: before.lastWeeklyReset,
      lastMonthlyReset: before.lastMonthlyReset,
    }

    controller.restoreChecklistContent(restored)
    controller.syncPort.acknowledgeOperationsThrough(
      controller.syncPort.captureSnapshot().operationVersion,
    )
    controller.restoreChecklistContent(undoSnapshot)
    const captured = controller.syncPort.captureSnapshot()
    const result = await controller.syncPort.applyExternalSnapshot({
      data: { ...before, ...restored },
      revision: { counter: 99, writerId: 'remote' },
    })

    expect(captured.data.daily).toEqual(before.daily)
    expect(result.outcome).toBe('merged')
    expect(controller.getSnapshot()).toEqual(before)
  })

  it('does not persist an unchanged external snapshot back to storage', async () => {
    let onExternalRevision: ((revision: StoredChecklistSnapshot['revision']) => void) | undefined
    const storage = adapter({ data: data(), revision: { counter: 1, writerId: 'remote' } })
    storage.subscribe = vi.fn((listener) => {
      onExternalRevision = listener
      return () => undefined
    })
    const controller = makeController(storage)
    await controller.start()
    vi.mocked(storage.save).mockClear()

    onExternalRevision?.({ counter: 2, writerId: 'remote' })
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

    await controller.syncPort.applyExternalSnapshot({
      data: { ...data(), daily: [{ ...data().daily[0], id: 'existing', text: 'same task' }] },
      revision: { counter: 99, writerId: 'remote' },
    })

    expect(controller.getSnapshot().daily.filter((item) => item.id === 'existing')).toHaveLength(1)
  })
})
