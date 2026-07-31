import { describe, expect, it, vi } from 'vitest'
import type { ChecklistData } from '../../src/types'
import { exportData, importData } from '../../src/utils/serialization'

const exportedFixture: ChecklistData = {
  daily: [],
  weekly: [],
  monthly: [],
  settings: { serverRegion: 'asia', isAutoMoveEnabled: false, shouldConfirmDelete: false },
  uiPreferences: { cloudPatchHidden: true },
  lastDailyReset: 'daily',
  lastWeeklyReset: 'weekly',
  lastMonthlyReset: 'monthly',
}

describe('exportData', () => {
  it('writes every persisted field in a stable, readable order', () => {
    const exported = exportData(exportedFixture)

    expect(JSON.parse(exported)).toEqual(exportedFixture)
    expect(Object.keys(JSON.parse(exported) as object)).toEqual([
      'daily',
      'weekly',
      'monthly',
      'settings',
      'uiPreferences',
      'lastDailyReset',
      'lastWeeklyReset',
      'lastMonthlyReset',
    ])
    expect(exported).toContain('\n  "daily"')
  })
})

describe('importData', () => {
  it('migrates legacy fields, fills defaults, and normalizes item order', () => {
    const result = importData(
      JSON.stringify({
        daily: [
          { text: 'Second', completed: true, hidden: true, order: 9 },
          { text: 'First', completed: false, order: 2, isPreset: true },
        ],
        weekly: [],
        custom: [{ text: 'Monthly', completed: true, order: 3 }],
        resetConfig: { serverRegion: 'europe' },
        settings: { autoMoveCompleted: false, confirmDelete: false, showCustomTab: true },
        lastCustomReset: '2026-07-01T05:00:00.000Z',
      }),
    )

    expect(result?.data.daily).toMatchObject([
      { text: 'First', isCompleted: false, isHidden: false, order: 1, tags: [] },
      { text: 'Second', isCompleted: true, isHidden: true, order: 2, tags: [] },
    ])
    expect(result?.data.daily.every((item) => item.id.length > 0)).toBe(true)
    expect(result?.data.monthly).toMatchObject([
      { text: 'Monthly', isCompleted: true, isHidden: false, order: 1, tags: [] },
    ])
    expect(result?.data.settings).toEqual({
      serverRegion: 'europe',
      isAutoMoveEnabled: false,
      shouldConfirmDelete: false,
    })
    expect(result?.data.lastMonthlyReset).toBe('2026-07-01T05:00:00.000Z')
    expect(result?.data.uiPreferences).toEqual({ cloudPatchHidden: false })
  })

  it('sets missing reset timestamps during import', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'))

    const result = importData(
      JSON.stringify({
        daily: [],
        weekly: [],
        monthly: [],
      }),
    )

    expect(result?.data.lastDailyReset).toBe('2026-07-10T12:00:00.000Z')
    expect(result?.data.lastWeeklyReset).toBe('2026-07-10T12:00:00.000Z')
    expect(result?.data.lastMonthlyReset).toBe('2026-07-10T12:00:00.000Z')
  })

  it('preserves valid timestamps and explicit false settings', () => {
    const result = importData(JSON.stringify(exportedFixture))

    expect(result?.data).toEqual(exportedFixture)
  })

  it('rejects malformed JSON and invalid item shapes', () => {
    expect(importData('{')).toBeNull()
    for (const value of [null, 1, 'data', [], {}]) {
      expect(importData(JSON.stringify(value))).toBeNull()
    }
    expect(
      importData(
        JSON.stringify({
          daily: [
            { text: 'Missing state', isCompleted: false, isHidden: false, order: 1, tags: [1] },
          ],
          weekly: [],
          monthly: [],
        }),
      ),
    ).toBeNull()
  })
})
