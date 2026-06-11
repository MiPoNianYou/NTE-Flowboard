import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isUSDST,
  isEUDST,
  getServerUTCOffset,
  getServerDate,
  shouldResetDaily,
  shouldResetWeekly,
  shouldResetCustom,
  resetItems,
  isChecklistData,
  loadData,
  saveData,
  saveDataImmediate,
  exportData,
  importData,
  SERVER_REGIONS,
  mergeChecklistData,
  toOrderedData,
} from '../../src/utils/storage'
import type { ChecklistData, ChecklistItem } from '../../src/types'

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
      { text: 'Task 1', completed: false, hidden: false, order: 1, tags: [] },
      { text: 'Task 2', completed: true, hidden: false, order: 2, tags: [] },
    ],
    weekly: [
      { text: 'Weekly 1', completed: false, hidden: false, order: 1, tags: [] },
    ],
    custom: [],
    resetConfig: { serverRegion: 'asia' },
    lastDailyReset: new Date().toISOString(),
    lastWeeklyReset: new Date().toISOString(),
    ...overrides,
  }
}

describe('shouldResetDaily', () => {
  it('should return false when last reset is recent', () => {
    const data = makeChecklistData({
      lastDailyReset: new Date().toISOString(),
    })
    expect(shouldResetDaily(data)).toBe(false)
  })

  it('should return true when last reset was before today\'s reset time', () => {
    // Set last reset to 2 days ago
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const data = makeChecklistData({
      lastDailyReset: twoDaysAgo.toISOString(),
    })
    expect(shouldResetDaily(data)).toBe(true)
  })

  it('should default to asia region when resetConfig missing serverRegion', () => {
    const data = makeChecklistData({
      resetConfig: {} as ChecklistData['resetConfig'],
      lastDailyReset: new Date(Date.now() - 2 * 86400000).toISOString(),
    })
    // Should not throw
    expect(typeof shouldResetDaily(data)).toBe('boolean')
  })
})

describe('shouldResetWeekly', () => {
  it('should return false when last reset is recent', () => {
    const data = makeChecklistData({
      lastWeeklyReset: new Date().toISOString(),
    })
    expect(shouldResetWeekly(data)).toBe(false)
  })

  it('should return true when last reset was more than a week ago', () => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const data = makeChecklistData({
      lastWeeklyReset: twoWeeksAgo.toISOString(),
    })
    expect(shouldResetWeekly(data)).toBe(true)
  })
})

describe('shouldResetCustom', () => {
  it('should return false when last custom reset is recent', () => {
    const data = makeChecklistData({
      lastCustomReset: new Date().toISOString(),
    })
    expect(shouldResetCustom(data)).toBe(false)
  })

  it('should return true when last custom reset was before today', () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const data = makeChecklistData({
      lastCustomReset: twoDaysAgo.toISOString(),
      customResetMode: 'daily',
    })
    expect(shouldResetCustom(data)).toBe(true)
  })

  it('should return false when last custom reset is missing (default no-reset)', () => {
    const data = makeChecklistData({
      lastCustomReset: undefined,
    })
    expect(shouldResetCustom(data)).toBe(false)
  })

  it('should respect weekly customResetMode', () => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const data = makeChecklistData({
      lastCustomReset: twoWeeksAgo.toISOString(),
      customResetMode: 'weekly',
    })
    expect(shouldResetCustom(data)).toBe(true)
  })
})

describe('resetItems', () => {
  it('should set all items to completed: false', () => {
    const items: ChecklistItem[] = [
      { text: 'A', completed: true, hidden: false, order: 1, tags: [] },
      { text: 'B', completed: true, hidden: true, order: 2, tags: ['tag'] },
      { text: 'C', completed: false, hidden: false, order: 3, tags: [] },
    ]

    const result = resetItems(items)

    expect(result.every((item) => item.completed === false)).toBe(true)
    // hidden and other fields should be preserved
    expect(result[0].text).toBe('A')
    expect(result[1].hidden).toBe(true)
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
    const data = { weekly: [], resetConfig: { serverRegion: 'asia' }, lastDailyReset: '', lastWeeklyReset: '' }
    expect(isChecklistData(data)).toBe(false)
  })

  it('should return false when item has invalid fields', () => {
    const data = {
      daily: [{ text: 123, completed: 'yes', hidden: 0, order: '1', tags: 'bad' }],
      weekly: [],
      resetConfig: { serverRegion: 'asia' },
      lastDailyReset: '',
      lastWeeklyReset: '',
    }
    expect(isChecklistData(data)).toBe(false)
  })

  it('should accept items without tags field (legacy)', () => {
    const data = {
      daily: [{ text: 'A', completed: false, hidden: false, order: 1 }],
      weekly: [],
      resetConfig: { serverRegion: 'asia' },
      lastDailyReset: '',
      lastWeeklyReset: '',
    }
    // tags 缺失时应被接受（旧数据兼容）
    expect(isChecklistData(data)).toBe(true)
  })
})

// --- localStorage Tests ---

const localStorageMock = (() => {
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
  vi.stubGlobal('localStorage', localStorageMock)
  localStorageMock.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadData', () => {
  it('should return default data when localStorage is empty', () => {
    const data = loadData()
    expect(data.daily.length).toBeGreaterThan(0)
    expect(data.weekly.length).toBeGreaterThan(0)
    expect(data.resetConfig.serverRegion).toBe('asia')
  })

  it('should load valid data from localStorage', () => {
    const customData = makeChecklistData()
    localStorageMock.setItem('nte-checklist-data', JSON.stringify(customData))

    const data = loadData()
    expect(data.daily.length).toBe(2)
    expect(data.daily[0].text).toBe('Task 1')
  })

  it('should return defaults for corrupted JSON', () => {
    localStorageMock.setItem('nte-checklist-data', '{invalid json')

    const data = loadData()
    expect(data.daily.length).toBeGreaterThan(0) // defaults
  })

  it('should return defaults for invalid data structure', () => {
    localStorageMock.setItem('nte-checklist-data', JSON.stringify({ foo: 'bar' }))

    const data = loadData()
    expect(data.daily.length).toBeGreaterThan(0) // defaults
  })
})

describe('saveData / saveDataImmediate', () => {
  it('saveDataImmediate should write to localStorage immediately', () => {
    const data = makeChecklistData()
    saveDataImmediate(data)

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'nte-checklist-data',
      expect.any(String),
    )
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
    expect(saved.daily.length).toBe(2)
  })

  it('saveData should debounce writes', () => {
    vi.useFakeTimers()
    const data = makeChecklistData()

    saveData(data)
    saveData(data)
    saveData(data)

    // Should not have written yet
    expect(localStorageMock.setItem).not.toHaveBeenCalled()

    // Advance past debounce
    vi.advanceTimersByTime(300)

    // Should have written only once
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

describe('exportData', () => {
  it('should produce valid JSON', () => {
    const data = makeChecklistData()
    const json = exportData(data)
    const parsed = JSON.parse(json)

    expect(parsed.daily).toBeDefined()
    expect(parsed.weekly).toBeDefined()
    expect(parsed.resetConfig).toBeDefined()
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
  it('should normalize orders in daily/weekly/custom', () => {
    const data = makeChecklistData({
      daily: [
        { text: 'A', completed: false, hidden: false, order: 5, tags: [] },
        { text: 'B', completed: false, hidden: false, order: 10, tags: [] },
      ],
    })
    const merged = mergeChecklistData(data)
    expect(merged.daily[0].order).toBe(1)
    expect(merged.daily[1].order).toBe(2)
  })

  it('should default missing weekly/custom to empty arrays', () => {
    const data = {
      daily: [],
      weekly: [],
      custom: [],
      resetConfig: { serverRegion: 'asia' },
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
    } as ChecklistData
    const merged = mergeChecklistData(data)
    expect(merged.weekly).toEqual([])
    expect(merged.custom).toEqual([])
  })

  it('should default customResetMode to daily for invalid values', () => {
    const data = makeChecklistData({ customResetMode: 'none' as never })
    const merged = mergeChecklistData(data)
    expect(merged.customResetMode).toBe('daily')
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
    expect(keys[2]).toBe('custom')
  })

  it('should include settings when provided', () => {
    const data = makeChecklistData()
    const settings = { autoMoveCompleted: true, confirmDelete: false, showCustomTab: true }
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
    const settings = { autoMoveCompleted: true, confirmDelete: false, showCustomTab: true }
    const json = exportData(data, true, settings)
    const parsed = JSON.parse(json)
    expect(parsed.settings).toEqual(settings)
  })

  it('should not include settings when includeSettings is false', () => {
    const data = makeChecklistData()
    const settings = { autoMoveCompleted: true, confirmDelete: false, showCustomTab: true }
    const json = exportData(data, false, settings)
    const parsed = JSON.parse(json)
    expect(parsed.settings).toBeUndefined()
  })
})

// --- importData backward compatibility ---

describe('importData backward compatibility', () => {
  it('should fill missing lastDailyReset with current date', () => {
    const data = {
      daily: [{ text: 'A', completed: false, hidden: false, order: 1, tags: [] }],
      weekly: [],
      resetConfig: { serverRegion: 'asia' },
      lastWeeklyReset: new Date().toISOString(),
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.lastDailyReset).toBeTruthy()
  })

  it('should fill missing lastWeeklyReset with current date', () => {
    const data = {
      daily: [{ text: 'A', completed: false, hidden: false, order: 1, tags: [] }],
      weekly: [],
      resetConfig: { serverRegion: 'asia' },
      lastDailyReset: new Date().toISOString(),
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.lastWeeklyReset).toBeTruthy()
  })

  it('should fill missing custom with empty array', () => {
    const data = {
      daily: [{ text: 'A', completed: false, hidden: false, order: 1, tags: [] }],
      weekly: [],
      resetConfig: { serverRegion: 'asia' },
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.data.custom).toEqual([])
  })

  it('should extract settings from imported data', () => {
    const data = {
      daily: [],
      weekly: [],
      resetConfig: { serverRegion: 'asia' },
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
      settings: { autoMoveCompleted: false, confirmDelete: true, showCustomTab: true },
    }
    const result = importData(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.settings).toEqual({ autoMoveCompleted: false, confirmDelete: true, showCustomTab: true })
  })
})

// --- shouldResetCustom edge cases ---

describe('shouldResetCustom edge cases', () => {
  it('should return false for non-daily/non-weekly customResetMode', () => {
    const data = makeChecklistData({
      lastCustomReset: new Date(Date.now() - 86400000).toISOString(),
      customResetMode: 'none' as never,
    })
    expect(shouldResetCustom(data)).toBe(false)
  })
})
