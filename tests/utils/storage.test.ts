import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resetItems,
  loadData,
  saveData,
  saveDataImmediate,
  createChecklistStorageAdapter,
} from '../../src/utils/storage'
import type { ChecklistData, ChecklistItem } from '../../src/types'

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
    lastDailyReset: new Date().toISOString(),
    lastWeeklyReset: new Date().toISOString(),
    lastMonthlyReset: new Date().toISOString(),
    ...overrides,
  }
}

describe('resetItems', () => {
  it('clears completion while preserving every other item field', () => {
    const items: ChecklistItem[] = [
      { id: 'ri1', text: 'A', isCompleted: true, isHidden: false, order: 1, tags: [] },
      { id: 'ri2', text: 'B', isCompleted: true, isHidden: true, order: 2, tags: ['tag'] },
    ]

    expect(resetItems(items)).toEqual([
      { ...items[0], isCompleted: false },
      { ...items[1], isCompleted: false },
    ])
  })

  it('supports an empty checklist', () => {
    expect(resetItems([])).toEqual([])
  })

  it('preserves references for items that are already incomplete', () => {
    const incomplete: ChecklistItem = {
      id: 'ri3',
      text: 'Already reset',
      isCompleted: false,
      isHidden: false,
      order: 1,
      tags: [],
    }

    expect(resetItems([incomplete])[0]).toBe(incomplete)
  })
})

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage)
  mockLocalStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('loadData', () => {
  it('returns independent defaults when storage is empty', () => {
    const data = loadData()

    expect(data.daily.length).toBeGreaterThan(0)
    expect(data.weekly.length).toBeGreaterThan(0)
    expect(data.settings.serverRegion).toBe('asia')
  })

  it('loads a valid saved checklist', () => {
    const customData = makeChecklistData()
    mockLocalStorage.setItem('flowboard-checklist', JSON.stringify(customData))
    mockLocalStorage.setItem.mockClear()

    expect(loadData()).toEqual(customData)
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
  })

  it('falls back to defaults for corrupted or invalid saved data', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    for (const raw of ['{invalid json', JSON.stringify({ foo: 'bar' })]) {
      mockLocalStorage.setItem('flowboard-checklist', raw)

      expect(loadData().daily.length).toBeGreaterThan(0)
      expect(mockLocalStorage.getItem('flowboard-corrupted-backup')).toBe(raw)
    }

    expect(consoleError).toHaveBeenCalled()
  })

  it('migrates legacy checklist and standalone behavior settings together', () => {
    mockLocalStorage.setItem(
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
    mockLocalStorage.setItem('nte-auto-move-completed', 'false')
    mockLocalStorage.setItem('nte-confirm-delete', 'false')

    const migrated = loadData()

    expect(migrated.daily).toEqual([
      expect.objectContaining({ text: 'Legacy daily', isCompleted: true, order: 1 }),
    ])
    expect(migrated.settings).toEqual({
      serverRegion: 'america',
      isAutoMoveEnabled: false,
      shouldConfirmDelete: false,
    })
    expect(mockLocalStorage.getItem('nte-checklist-data')).toBeNull()
    expect(mockLocalStorage.getItem('flowboard-setting-auto-move')).toBeNull()
    expect(mockLocalStorage.getItem('flowboard-setting-confirm-delete')).toBeNull()
  })
})

describe('saveData', () => {
  it('writes immediately when requested', () => {
    saveDataImmediate(makeChecklistData())

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('flowboard-checklist', expect.any(String))
  })

  it('coalesces consecutive writes into one delayed save', () => {
    vi.useFakeTimers()
    const data = makeChecklistData()

    saveData(data)
    saveData(data)
    saveData(data)

    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1)
  })
})

describe('createChecklistStorageAdapter', () => {
  it('reads a valid unversioned envelope as a legacy snapshot', async () => {
    const input = makeChecklistData()
    mockLocalStorage.setItem('flowboard-checklist', JSON.stringify({ data: input }))

    const loaded = await createChecklistStorageAdapter().read()

    expect(loaded).toEqual({
      data: input,
      revision: { counter: 0, writerId: '' },
    })
  })

  it('round-trips an enveloped checklist snapshot', async () => {
    const adapter = createChecklistStorageAdapter()
    const input = makeChecklistData()

    const saved = await adapter.save(input, { counter: 0, writerId: '' })
    const loaded = await adapter.read()

    expect(saved.data).toEqual(input)
    expect(loaded).toEqual(saved)
    expect(loadData()).toEqual(input)
  })

  it('increments from the latest stored revision across adapter instances', async () => {
    const firstAdapter = createChecklistStorageAdapter()
    const secondAdapter = createChecklistStorageAdapter()
    const firstSave = await firstAdapter.save(makeChecklistData(), { counter: 0, writerId: '' })
    const secondData = makeChecklistData({ daily: [] })

    const secondSave = await secondAdapter.save(secondData, { counter: 0, writerId: '' })

    expect(firstSave.revision.counter).toBe(1)
    expect(secondSave.revision.counter).toBe(2)
    expect(await firstAdapter.read()).toEqual(secondSave)
  })

  it('publishes external revisions until the subscription is removed', () => {
    const adapter = createChecklistStorageAdapter()
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe(listener)
    const externalSnapshot = {
      data: makeChecklistData({ daily: [] }),
      revision: { counter: 7, writerId: 'other-tab' },
    }
    mockLocalStorage.setItem('flowboard-checklist', JSON.stringify(externalSnapshot))

    window.dispatchEvent(new StorageEvent('storage', { key: 'flowboard-checklist' }))

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(externalSnapshot.revision)

    unsubscribe()
    window.dispatchEvent(new StorageEvent('storage', { key: 'flowboard-checklist' }))
    expect(listener).toHaveBeenCalledOnce()
  })
})
