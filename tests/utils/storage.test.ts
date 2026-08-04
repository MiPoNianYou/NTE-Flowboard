import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistData } from '../../src/types'
import { createChecklistStorageAdapter, EMPTY_CHECKLIST_REVISION } from '../../src/utils/storage'

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
