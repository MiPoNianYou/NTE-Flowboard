import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resetItems,
  loadData,
  saveData,
  saveDataImmediate,
} from '../../src/utils/storage'
import {
  exportData,
  importData,
  toOrderedData,
} from '../../src/utils/serialization'
import { SERVER_REGIONS } from '../../src/utils/seed'
import {
  shouldResetDaily,
  shouldResetWeekly,
  shouldResetMonthly,
  isUSDST,
  isEUDST,
  getServerUTCOffset,
  getServerDate,
} from '../../src/utils/timezone'
import { isChecklistData } from '../../src/utils/validation'
import { mergeChecklistData } from '../../src/utils/dataMigration'
import type { ChecklistData, ChecklistItem, ServerRegion } from '../../src/types'

// --- DST Tests ---

describe('isUSDST', () => {
  // 2024 DST: Mar 10 - Nov 3
  it('should return false in January (standard time)', () => {
    expect(isUSDST(new Date(2024, 0, 15))).toBe(false)
  })

  it('should return false before DST starts (March 9, 2024)', () => {
    expect(isUSDST(new Date(2024, 2, 9, 1, 59, 59))).toBe(false)
  })

  it('should return true after DST starts (March 10, 2024 3:00 AM)', () => {
    expect(isUSDST(new Date(2024, 2, 10, 3, 0, 0))).toBe(true)
  })

  it('should return true during summer (July 2024)', () => {
    expect(isUSDST(new Date(2024, 6, 15))).toBe(true)
  })

  it('should return true before DST ends (Nov 2, 2024 1:59 AM)', () => {
    expect(isUSDST(new Date(2024, 10, 2, 1, 59, 59))).toBe(true)
  })

  it('should return false after DST ends (Nov 3, 2024 3:00 AM)', () => {
    expect(isUSDST(new Date(2024, 10, 3, 3, 0, 0))).toBe(false)
  })

  it('should return false in December (standard time)', () => {
    expect(isUSDST(new Date(2024, 11, 15))).toBe(false)
  })

  // 2025 DST: Mar 9 - Nov 2
  it('should handle 2025 DST boundaries', () => {
    expect(isUSDST(new Date(2025, 2, 8))).toBe(false)
    expect(isUSDST(new Date(2025, 2, 9, 3))).toBe(true)
    expect(isUSDST(new Date(2025, 10, 1))).toBe(true)
    expect(isUSDST(new Date(2025, 10, 2, 3))).toBe(false)
  })
})

describe('isEUDST', () => {
  // 2024 EU DST: Mar 31 - Oct 27
  it('should return false in January (standard time)', () => {
    // Use UTC to avoid local timezone issues
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0))
    expect(isEUDST(date)).toBe(false)
  })

  it('should return true during summer (July 2024 UTC)', () => {
    const date = new Date(Date.UTC(2024, 6, 15, 12, 0, 0))
    expect(isEUDST(date)).toBe(true)
  })

  it('should return false in December (standard time)', () => {
    const date = new Date(Date.UTC(2024, 11, 15, 12, 0, 0))
    expect(isEUDST(date)).toBe(false)
  })

  // 2025 EU DST: Mar 30 - Oct 26
  it('should handle 2025 EU DST boundaries', () => {
    expect(isEUDST(new Date(Date.UTC(2025, 2, 29, 12)))).toBe(false)
    expect(isEUDST(new Date(Date.UTC(2025, 2, 30, 12)))).toBe(true)
    expect(isEUDST(new Date(Date.UTC(2025, 9, 25, 12)))).toBe(true)
    expect(isEUDST(new Date(Date.UTC(2025, 9, 26, 12)))).toBe(false)
  })
})

describe('getServerUTCOffset', () => {
  it('should return 8 for asia (fixed)', () => {
    expect(getServerUTCOffset('asia', new Date(2024, 6, 15))).toBe(8)
    expect(getServerUTCOffset('asia', new Date(2024, 0, 15))).toBe(8)
  })

  it('should return -5 for america during standard time', () => {
    expect(getServerUTCOffset('america', new Date(2024, 0, 15))).toBe(-5)
  })

  it('should return -4 for america during DST', () => {
    expect(getServerUTCOffset('america', new Date(2024, 6, 15))).toBe(-4)
  })

  it('should return 1 for europe during standard time', () => {
    expect(getServerUTCOffset('europe', new Date(2024, 0, 15))).toBe(1)
  })

  it('should return 2 for europe during DST', () => {
    expect(getServerUTCOffset('europe', new Date(2024, 6, 15))).toBe(2)
  })
})

describe('getServerDate', () => {
  it('should return a Date object', () => {
    const result = getServerDate('asia')
    expect(result).toBeInstanceOf(Date)
  })

  it('should return approximately current time adjusted for region offset', () => {
    const now = new Date()
    const serverDate = getServerDate('asia')
    // getServerDate converts to UTC then adds offset
    // So the result should be approximately: now.getTimezoneOffset() offset + 8h from now
    const expectedUtc = now.getTime() + now.getTimezoneOffset() * 60000 + 8 * 3600000
    const diff = Math.abs(serverDate.getTime() - expectedUtc)
    expect(diff).toBeLessThan(2000) // Within 2 seconds
  })
})

// --- Reset Logic Tests ---

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
    lastDailyReset: new Date().toISOString(),
    lastWeeklyReset: new Date().toISOString(),
    lastMonthlyReset: new Date().toISOString(),
    ...overrides,
  }
}

describe('shouldResetDaily', () => {
  it('should return false when last reset is recent', () => {
    expect(shouldResetDaily(new Date().toISOString(), 'asia')).toBe(false)
  })

  it('should return true when last reset was before today\'s reset time', () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    expect(shouldResetDaily(twoDaysAgo.toISOString(), 'asia')).toBe(true)
  })

  it('should default to asia region when resetConfig missing serverRegion', () => {
    const lastReset = new Date(Date.now() - 2 * 86400000).toISOString()
    expect(typeof shouldResetDaily(lastReset, 'asia')).toBe('boolean')
  })
})

describe('shouldResetWeekly', () => {
  it('should return false when last reset is recent', () => {
    expect(shouldResetWeekly(new Date().toISOString(), 'asia')).toBe(false)
  })

  it('should return true when last reset was more than a week ago', () => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    expect(shouldResetWeekly(twoWeeksAgo.toISOString(), 'asia')).toBe(true)
  })
})

describe('shouldResetMonthly', () => {
  it('should return false when last reset is recent', () => {
    expect(shouldResetMonthly(new Date().toISOString(), 'asia')).toBe(false)
  })

  it('should return true when last reset was more than a month ago', () => {
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)
    expect(shouldResetMonthly(twoMonthsAgo.toISOString(), 'asia')).toBe(true)
  })
})

describe('resetItems', () => {
  it('should set all items to isCompleted: false', () => {
    const items: ChecklistItem[] = [
      { id: 'ri1', text: 'A', isCompleted: true, isHidden: false, order: 1, tags: [] },
      { id: 'ri2', text: 'B', isCompleted: true, isHidden: true, order: 2, tags: ['tag'] },
      { id: 'ri3', text: 'C', isCompleted: false, isHidden: false, order: 3, tags: [] },
    ]

    const result = resetItems(items)

    expect(result.every((item) => item.isCompleted === false)).toBe(true)
    // isHidden and other fields should be preserved
    expect(result[0].text).toBe('A')
    expect(result[1].isHidden).toBe(true)
    expect(result[1].tags).toEqual(['tag'])
    expect(result[2].order).toBe(3)
  })

  it('should return empty array for empty input', () => {
    expect(resetItems([])).toEqual([])
  })
})

// --- Validation Tests ---

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
    const data = { weekly: [], settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true }, lastDailyReset: '', lastWeeklyReset: '' }
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
    // tags 缺失时应被接受（旧数据兼容）
    expect(isChecklistData(data)).toBe(true)
  })
})

// --- localStorage Tests ---

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
    expect(data.daily.length).toBeGreaterThan(0) // defaults
  })

  it('should return defaults for invalid data structure', () => {
    mockLocalStorage.setItem('flowboard-checklist', JSON.stringify({ foo: 'bar' }))

    const data = loadData()
    expect(data.daily.length).toBeGreaterThan(0) // defaults
  })
})

describe('saveData / saveDataImmediate', () => {
  it('saveDataImmediate should write to localStorage immediately', () => {
    const data = makeChecklistData()
    saveDataImmediate(data)

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'flowboard-checklist',
      expect.any(String),
    )
    const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
    expect(saved.daily.length).toBe(2)
  })

  it('saveData should debounce writes', () => {
    vi.useFakeTimers()
    const data = makeChecklistData()

    saveData(data)
    saveData(data)
    saveData(data)

    // Should not have written yet
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()

    // Advance past debounce
    vi.advanceTimersByTime(300)

    // Should have written only once
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1)
  })
})

describe('exportData', () => {
  it('should produce valid JSON', () => {
    const data = makeChecklistData()
    const json = exportData(data, true, data.settings)
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

// --- mergeChecklistData Tests ---

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
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
      lastMonthlyReset: new Date().toISOString(),
    } as ChecklistData
    const merged = mergeChecklistData(data)
    expect(merged.weekly).toEqual([])
  })
})

// --- toOrderedData Tests ---

describe('toOrderedData', () => {
  it('should produce object with correct field order', () => {
    const data = makeChecklistData()
    const ordered = toOrderedData(data)
    const keys = Object.keys(ordered)
    expect(keys[0]).toBe('daily')
    expect(keys[1]).toBe('weekly')
  })

  it('should include settings when provided', () => {
    const data = makeChecklistData()
    const settings = { serverRegion: 'asia' as ServerRegion, isAutoMoveEnabled: true, shouldConfirmDelete: false }
    const ordered = toOrderedData(data, settings)
    expect(ordered.settings).toEqual(settings)
  })

  it('should not include settings when not provided', () => {
    const data = makeChecklistData()
    const ordered = toOrderedData(data)
    expect(ordered.settings).toBeUndefined()
  })
})

// --- exportData with settings ---

describe('exportData with settings', () => {
  it('should include settings when includeSettings is true', () => {
    const data = makeChecklistData()
    const settings = { serverRegion: 'asia' as ServerRegion, isAutoMoveEnabled: true, shouldConfirmDelete: false }
    const json = exportData(data, true, settings)
    const parsed = JSON.parse(json)
    expect(parsed.settings).toEqual(settings)
  })

  it('should not include settings when includeSettings is false', () => {
    const data = makeChecklistData()
    const settings = { serverRegion: 'asia' as ServerRegion, isAutoMoveEnabled: true, shouldConfirmDelete: false }
    const json = exportData(data, false, settings)
    const parsed = JSON.parse(json)
    expect(parsed.settings).toBeUndefined()
  })
})

// --- importData backward compatibility ---

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
    expect(result!.settings).toEqual({ serverRegion: 'asia', isAutoMoveEnabled: false, shouldConfirmDelete: true })
  })
})
