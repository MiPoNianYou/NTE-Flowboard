import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resetItems, loadData, saveData, saveDataImmediate } from '../../utils/storage'
import type { ChecklistData, ChecklistItem } from '../../types'

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

    expect(loadData()).toEqual(customData)
  })

  it('falls back to defaults for corrupted or invalid saved data', () => {
    for (const raw of ['{invalid json', JSON.stringify({ foo: 'bar' })]) {
      mockLocalStorage.setItem('flowboard-checklist', raw)

      expect(loadData().daily.length).toBeGreaterThan(0)
    }
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
