import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resetItems, loadData, saveData, saveDataImmediate } from '../../utils/storage'
import { exportData, importData, toOrderedData } from '../../utils/serialization'
import { SERVER_REGIONS } from '../../utils/defaultData'

import { isChecklistData } from '../../utils/validation'
import { mergeChecklistData } from '../../utils/dataMigration'
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
  it('should set all items to isCompleted: false', () => {
    const items: ChecklistItem[] = [
      { id: 'ri1', text: 'A', isCompleted: true, isHidden: false, order: 1, tags: [] },
      { id: 'ri2', text: 'B', isCompleted: true, isHidden: true, order: 2, tags: ['tag'] },
      { id: 'ri3', text: 'C', isCompleted: false, isHidden: false, order: 3, tags: [] },
    ]

    const result = resetItems(items)

    expect(result.every((item) => item.isCompleted === false)).toBe(true)
    expect(result[0].text).toBe('A')
    expect(result[1].isHidden).toBe(true)
    expect(result[1].tags).toEqual(['tag'])
    expect(result[2].order).toBe(3)
  })

  it('should return empty array for empty input', () => {
    expect(resetItems([])).toEqual([])
  })
})

describe('isChecklistData', () => {
  it('should return true for valid data', () => {
    const data = makeChecklistData()
    expect(isChecklistData(data)).toBe(true)
  })

  it('should return false for null', () => {
    expect(isChecklistData(null)).toBe(false)
  })

  it('should return false for non-object', () => {
    expect(isChecklistData('string')).toBe(false)
    expect(isChecklistData(42)).toBe(false)
  })

  it('should return false when daily is missing', () => {
    const data = {
      weekly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      lastDailyReset: '',
      lastWeeklyReset: '',
    }
    expect(isChecklistData(data)).toBe(false)
  })

  it('should return false when item has invalid fields', () => {
    const data = {
      daily: [{ text: 123, isCompleted: 'yes', isHidden: 0, order: '1', tags: 'bad' }],
      weekly: [],
      monthly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      lastDailyReset: '',
      lastWeeklyReset: '',
      lastMonthlyReset: '',
    }
    expect(isChecklistData(data)).toBe(false)
  })

  it('should accept items without tags field (legacy)', () => {
    const data = {
      daily: [{ text: 'A', isCompleted: false, isHidden: false, order: 1 }],
      weekly: [],
      monthly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      lastDailyReset: '',
      lastWeeklyReset: '',
      lastMonthlyReset: '',
    }
    expect(isChecklistData(data)).toBe(true)
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
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
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
  it('should return default data when localStorage is empty', () => {
    const data = loadData()
    expect(data.daily.length).toBeGreaterThan(0)
    expect(data.weekly.length).toBeGreaterThan(0)
    expect(data.settings.serverRegion).toBe('asia')
  })

  it('should load valid data from localStorage', () => {
    const customData = makeChecklistData()
    mockLocalStorage.setItem('flowboard-checklist', JSON.stringify(customData))

    const data = loadData()
    expect(data.daily.length).toBe(2)
    expect(data.daily[0].text).toBe('Task 1')
  })

  it('should return defaults for corrupted JSON', () => {
    mockLocalStorage.setItem('flowboard-checklist', '{invalid json')

    const data = loadData()
    expect(data.daily.length).toBeGreaterThan(0)
  })

  it('should return defaults for invalid data structure', () => {
    mockLocalStorage.setItem('flowboard-checklist', JSON.stringify({ foo: 'bar' }))

    const data = loadData()
    expect(data.daily.length).toBeGreaterThan(0)
  })
})

describe('saveData / saveDataImmediate', () => {
  it('saveDataImmediate should write to localStorage immediately', () => {
    const data = makeChecklistData()
    saveDataImmediate(data)

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('flowboard-checklist', expect.any(String))
    const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
    expect(saved.daily.length).toBe(2)
  })

  it('saveData should debounce writes', () => {
    vi.useFakeTimers()
    const data = makeChecklistData()

    saveData(data)
    saveData(data)
    saveData(data)

    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)

    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1)
  })
})

describe('exportData', () => {
  it('should produce valid JSON', () => {
    const data = makeChecklistData()
    const json = exportData(data)
    const parsed = JSON.parse(json)

    expect(parsed.daily).toBeDefined()
    expect(parsed.weekly).toBeDefined()
    expect(parsed.settings).toBeDefined()
  })
})

describe('importData', () => {
  it('should parse valid JSON', () => {
    const data = makeChecklistData()
    const json = JSON.stringify(data)

    const result = importData(json)
    expect(result).not.toBeNull()
    expect(result!.data.daily.length).toBe(2)
  })

  it('should return null for invalid JSON', () => {
    expect(importData('{bad')).toBeNull()
  })

  it('should return null for non-object JSON', () => {
    expect(importData('"string"')).toBeNull()
    expect(importData('42')).toBeNull()
  })

  it('should return null for missing required fields', () => {
    expect(importData(JSON.stringify({ daily: [] }))).toBeNull()
  })
})

describe('SERVER_REGIONS', () => {
  it('should have asia, america, europe', () => {
    expect(SERVER_REGIONS).toHaveProperty('asia')
    expect(SERVER_REGIONS).toHaveProperty('america')
    expect(SERVER_REGIONS).toHaveProperty('europe')
  })

  it('each region should have label and description', () => {
    for (const region of Object.values(SERVER_REGIONS)) {
      expect(typeof region.label).toBe('string')
      expect(typeof region.description).toBe('string')
    }
  })
})

describe('mergeChecklistData', () => {
  it('should normalize orders in daily/weekly', () => {
    const data = makeChecklistData({
      daily: [
        { id: 'mg1', text: 'A', isCompleted: false, isHidden: false, order: 5, tags: [] },
        { id: 'mg2', text: 'B', isCompleted: false, isHidden: false, order: 10, tags: [] },
      ],
    })
    const merged = mergeChecklistData(data)
    expect(merged.daily[0].order).toBe(1)
    expect(merged.daily[1].order).toBe(2)
  })

  it('should default missing weekly to empty arrays', () => {
    const data = {
      daily: [],
      weekly: [],
      monthly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      uiPreferences: { cloudPatchHidden: false },
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
      lastMonthlyReset: new Date().toISOString(),
    } as ChecklistData
    const merged = mergeChecklistData(data)
    expect(merged.weekly).toEqual([])
  })
})

describe('toOrderedData', () => {
  it('should produce object with correct field order', () => {
    const data = makeChecklistData()
    const ordered = toOrderedData(data)
    const keys = Object.keys(ordered)
    expect(keys[0]).toBe('daily')
    expect(keys[1]).toBe('weekly')
  })

  it('should always include settings', () => {
    const data = makeChecklistData()
    const ordered = toOrderedData(data)
    expect(ordered.settings).toEqual(data.settings)
  })

  it('should always include uiPreferences', () => {
    const data = makeChecklistData()
    const ordered = toOrderedData(data)
    expect(ordered.uiPreferences).toEqual(data.uiPreferences)
  })
})

describe('exportData with settings', () => {
  it('should include settings in exported JSON', () => {
    const data = makeChecklistData()
    const json = exportData(data)
    const parsed = JSON.parse(json)
    expect(parsed.settings).toEqual(data.settings)
  })

  it('should include uiPreferences in exported JSON', () => {
    const data = makeChecklistData()
    const json = exportData(data)
    const parsed = JSON.parse(json)
    expect(parsed.uiPreferences).toEqual(data.uiPreferences)
  })
})

describe('importData backward compatibility', () => {
  it('should fill missing lastDailyReset with current date', () => {
    const data = {
      daily: [{ id: 'bc1', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] }],
      weekly: [],
      monthly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      lastWeeklyReset: new Date().toISOString(),
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.lastDailyReset).toBeTruthy()
  })

  it('should fill missing lastWeeklyReset with current date', () => {
    const data = {
      daily: [{ id: 'bc2', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] }],
      weekly: [],
      monthly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      lastDailyReset: new Date().toISOString(),
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.lastWeeklyReset).toBeTruthy()
  })

  it('should fill missing lastMonthlyReset with current date', () => {
    const data = {
      daily: [{ id: 'bc3', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] }],
      weekly: [],
      monthly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.lastMonthlyReset).toBeTruthy()
  })

  it('should fill missing monthly field with empty array', () => {
    const data = {
      daily: [{ id: 'bc4', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] }],
      weekly: [],
      settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
      lastMonthlyReset: new Date().toISOString(),
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.monthly).toEqual([])
  })

  it('should extract settings from imported data', () => {
    const data = {
      daily: [],
      weekly: [],
      monthly: [],
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
      lastMonthlyReset: new Date().toISOString(),
      settings: { serverRegion: 'asia', isAutoMoveEnabled: false, shouldConfirmDelete: true },
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.settings).toEqual({
      serverRegion: 'asia',
      isAutoMoveEnabled: false,
      shouldConfirmDelete: true,
    })
  })
})
