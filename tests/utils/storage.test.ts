import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistData } from '../../src/types'
import { createChecklistStorageAdapter, EMPTY_CHECKLIST_REVISION } from '../../src/utils/storage'
import { subscribeLegacyStorageEvents } from '../../src/utils/legacyStorageEvents'

function makeChecklistData(overrides: Partial<ChecklistData> = {}): ChecklistData {
  return {
    daily: [
      { id: 'st1', text: 'Task 1', isCompleted: false, isHidden: false, order: 1, tags: [] },
      { id: 'st2', text: 'Task 2', isCompleted: true, isHidden: false, order: 2, tags: [] },
    ],
    weekly: [
      { id: 'sw1', text: 'Weekly 1', isCompleted: false, isHidden: false, order: 1, tags: [] },
    ],
    monthly: [],
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
    uiPreferences: { cloudPatchHidden: false },
    lastDailyReset: '2026-08-04T00:00:00.000Z',
    lastWeeklyReset: '2026-08-04T00:00:00.000Z',
    lastMonthlyReset: '2026-08-04T00:00:00.000Z',
    ...overrides,
  }
}

function createStorage() {
  let values = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => {
      values = new Map()
    }),
  } as unknown as Storage
}

function createAdapter(storage: Storage, writerId = 'writer') {
  return createChecklistStorageAdapter({
    storage,
    createDefaultData: () => makeChecklistData(),
    createWriterId: () => writerId,
  })
}

describe('createChecklistStorageAdapter', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createStorage()
  })

  afterEach(() => vi.restoreAllMocks())

  it('returns an explicit synchronous default result for empty storage', () => {
    const result = createAdapter(storage).load()

    expect(result).toEqual({
      status: 'defaulted',
      snapshot: { data: makeChecklistData(), revision: EMPTY_CHECKLIST_REVISION },
      error: null,
    })
  })

  it('loads a valid enveloped checklist without rewriting it', () => {
    const input = makeChecklistData({ daily: [] })
    storage.setItem('flowboard-checklist', JSON.stringify({ data: input, revision: '4:other' }))
    vi.mocked(storage.setItem).mockClear()

    const result = createAdapter(storage).load()

    expect(result.status).toBe('loaded')
    expect(result.snapshot.data).toEqual(input)
    expect(result.snapshot.revision).toBe('4:other')
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('cleans a residual legacy revision beside a valid envelope', () => {
    const input = makeChecklistData({ daily: [] })
    storage.setItem('flowboard-checklist', JSON.stringify({ data: input, revision: '4:current' }))
    storage.setItem('flowboard-checklist-revision', JSON.stringify({ counter: 2, writerId: 'old' }))

    expect(createAdapter(storage).load().status).toBe('loaded')
    expect(storage.getItem('flowboard-checklist-revision')).toBeNull()
  })

  it('backs up invalid data and reports recovery without emitting UI effects', () => {
    storage.setItem('flowboard-checklist', '{invalid json')

    const result = createAdapter(storage).load()

    expect(result.status).toBe('recovered')
    expect(result.error).toBe('invalid-checklist')
    expect(storage.getItem('flowboard-corrupted-backup')).toBe('{invalid json')
    expect(result.snapshot.data).toEqual(makeChecklistData())
  })

  it('migrates legacy checklist data and checklist-owned standalone settings', () => {
    storage.setItem(
      'nte-checklist-data',
      JSON.stringify({
        daily: [{ text: 'Legacy daily', completed: true, order: 4 }],
        weekly: [],
        custom: [],
        settings: { serverRegion: 'america' },
        lastDailyReset: '2026-07-01T00:00:00.000Z',
        lastWeeklyReset: '2026-07-01T00:00:00.000Z',
        lastCustomReset: '2026-07-01T00:00:00.000Z',
      }),
    )
    storage.setItem('nte-auto-move-completed', 'false')
    storage.setItem('nte-confirm-delete', 'false')

    const result = createAdapter(storage).load()

    expect(result.status).toBe('migrated')
    expect(result.snapshot.data.daily).toEqual([
      expect.objectContaining({ text: 'Legacy daily', isCompleted: true, order: 1 }),
    ])
    expect(result.snapshot.data.settings).toEqual({
      serverRegion: 'america',
      isAutoMoveEnabled: false,
      shouldConfirmDelete: false,
    })
    expect(storage.getItem('nte-checklist-data')).toBeNull()
    expect(storage.getItem('nte-auto-move-completed')).toBeNull()
    expect(storage.getItem('nte-confirm-delete')).toBeNull()
  })

  it('cleans an equivalent legacy checklist when both formats coexist', () => {
    const input = makeChecklistData()
    storage.setItem('flowboard-checklist', JSON.stringify({ data: input, revision: '4:current' }))
    storage.setItem('nte-checklist-data', JSON.stringify(input))

    const result = createAdapter(storage).load()

    expect(result.status).toBe('loaded')
    expect(result.error).toBeNull()
    expect(result.snapshot.data).toEqual(input)
    expect(storage.getItem('nte-checklist-data')).toBeNull()
  })

  it('keeps the current checklist and retries when equivalent legacy cleanup fails', () => {
    const input = makeChecklistData()
    storage.setItem('flowboard-checklist', JSON.stringify({ data: input, revision: '4:current' }))
    storage.setItem('nte-checklist-data', JSON.stringify(input))
    const events: string[] = []
    const unsubscribe = subscribeLegacyStorageEvents((event) => events.push(event))
    const originalRemoveItem = vi.mocked(storage.removeItem).getMockImplementation()!
    vi.mocked(storage.removeItem).mockImplementation((key: string) => {
      if (key !== 'nte-checklist-data') originalRemoveItem(key)
    })

    const result = createAdapter(storage).load()

    expect(result.status).toBe('loaded')
    expect(result.error).toBe('legacy-cleanup-failed')
    expect(result.snapshot.data).toEqual(input)
    expect(storage.getItem('nte-checklist-data')).toBe(JSON.stringify(input))
    expect(events).toContain('failed')
    unsubscribe()
  })

  it('keeps conflicting standalone legacy values after migrating the first valid value', () => {
    storage.setItem('nte-auto-move-completed', 'true')
    storage.setItem('flowboard-setting-auto-move', 'false')

    const result = createAdapter(storage).load()

    expect(result.status).toBe('migrated')
    expect(result.error).toBe('legacy-conflict')
    expect(result.snapshot.data.settings.isAutoMoveEnabled).toBe(true)
    expect(storage.getItem('nte-auto-move-completed')).toBeNull()
    expect(storage.getItem('flowboard-setting-auto-move')).toBe('false')
  })

  it('keeps a conflicting legacy checklist and reports the conflict', () => {
    const current = makeChecklistData()
    const legacy = makeChecklistData({ daily: [] })
    storage.setItem('flowboard-checklist', JSON.stringify({ data: current, revision: '4:current' }))
    storage.setItem('nte-checklist-data', JSON.stringify(legacy))

    const result = createAdapter(storage).load()

    expect(result.status).toBe('loaded')
    expect(result.error).toBe('legacy-conflict')
    expect(result.snapshot.data).toEqual(current)
    expect(storage.getItem('nte-checklist-data')).toBe(JSON.stringify(legacy))
  })

  it('backs up an invalid current checklist and rebuilds it from valid legacy data', () => {
    const legacy = makeChecklistData({ weekly: [] })
    storage.setItem('flowboard-checklist', '{broken')
    storage.setItem('nte-checklist-data', JSON.stringify(legacy))

    const result = createAdapter(storage).load()

    expect(result.status).toBe('migrated')
    expect(result.error).toBeNull()
    expect(result.snapshot.data).toEqual(legacy)
    expect(storage.getItem('flowboard-corrupted-backup')).toBe('{broken')
    expect(storage.getItem('nte-checklist-data')).toBeNull()
  })

  it('deletes invalid legacy checklist data while keeping a valid current checklist', () => {
    const current = makeChecklistData()
    storage.setItem('flowboard-checklist', JSON.stringify({ data: current, revision: '4:current' }))
    storage.setItem('nte-checklist-data', '{broken')

    const result = createAdapter(storage).load()

    expect(result.status).toBe('loaded')
    expect(result.error).toBeNull()
    expect(storage.getItem('nte-checklist-data')).toBeNull()
  })

  it('keeps valid legacy data when the new checklist cannot be written', () => {
    const legacy = makeChecklistData()
    storage.setItem('nte-checklist-data', JSON.stringify(legacy))
    vi.mocked(storage.setItem).mockImplementationOnce(() => {
      throw new Error('quota exceeded')
    })

    const result = createAdapter(storage).load()

    expect(result.status).toBe('recovered')
    expect(result.error).toBe('storage-read-failed')
    expect(storage.getItem('nte-checklist-data')).toBe(JSON.stringify(legacy))
  })

  it('upgrades legacy fields stored under the current checklist key', () => {
    storage.setItem(
      'flowboard-checklist',
      JSON.stringify({
        daily: [{ text: 'Legacy', completed: true, hidden: false, order: 1 }],
        weekly: [],
        custom: [],
        settings: { autoMoveCompleted: false, confirmDelete: false },
        lastDailyReset: '2026-07-01T00:00:00.000Z',
        lastWeeklyReset: '2026-07-01T00:00:00.000Z',
        lastCustomReset: '2026-07-01T00:00:00.000Z',
      }),
    )

    const result = createAdapter(storage).load()

    expect(result.status).toBe('migrated')
    expect(result.snapshot.data.daily[0]).toEqual(
      expect.objectContaining({ text: 'Legacy', isCompleted: true, isHidden: false }),
    )
    expect(result.snapshot.data.settings).toEqual(
      expect.objectContaining({ isAutoMoveEnabled: false, shouldConfirmDelete: false }),
    )
  })

  it('upgrades a valid unversioned checklist into the current envelope', () => {
    const input = makeChecklistData()
    storage.setItem('flowboard-checklist', JSON.stringify(input))

    const result = createAdapter(storage).load()

    expect(result.status).toBe('migrated')
    expect(result.snapshot.data).toEqual(input)
    expect(result.snapshot.revision).not.toBe(EMPTY_CHECKLIST_REVISION)
    expect(JSON.parse(storage.getItem('flowboard-checklist')!)).toEqual({
      data: input,
      revision: result.snapshot.revision,
    })
  })

  it('round-trips snapshots and advances opaque revisions across adapter instances', () => {
    const first = createAdapter(storage, 'first')
    const second = createAdapter(storage, 'second')
    const firstSaved = first.save(makeChecklistData(), EMPTY_CHECKLIST_REVISION)
    const secondSaved = second.save(makeChecklistData({ daily: [] }), EMPTY_CHECKLIST_REVISION)

    expect(first.isNewer(secondSaved.revision, firstSaved.revision)).toBe(true)
    expect(first.load().snapshot).toEqual(secondSaved)
    expect(typeof secondSaved.revision).toBe('string')
  })

  it('publishes complete external snapshots until unsubscribed', () => {
    const adapter = createAdapter(storage)
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe(listener)
    const externalSnapshot = {
      data: makeChecklistData({ daily: [] }),
      revision: '7:other-tab',
    }
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'flowboard-checklist',
        newValue: JSON.stringify(externalSnapshot),
      }),
    )

    expect(listener).toHaveBeenCalledWith(externalSnapshot)
    unsubscribe()
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'flowboard-checklist',
        newValue: JSON.stringify(externalSnapshot),
      }),
    )
    expect(listener).toHaveBeenCalledOnce()
  })

  it('reports unavailable storage through the load result', () => {
    const result = createChecklistStorageAdapter({
      storage: null,
      createDefaultData: () => makeChecklistData(),
    }).load()

    expect(result.status).toBe('recovered')
    expect(result.error).toBe('storage-read-failed')
  })
})
