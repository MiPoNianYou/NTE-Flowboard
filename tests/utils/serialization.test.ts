import { describe, expect, it, vi } from 'vitest'
import { importData } from '../../src/utils/serialization'

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

  it('rejects malformed JSON and invalid item shapes', () => {
    expect(importData('{')).toBeNull()
    expect(
      importData(
        JSON.stringify({
          daily: [{ text: 'Missing state', isCompleted: false, isHidden: false, order: 1, tags: [1] }],
          weekly: [],
          monthly: [],
        }),
      ),
    ).toBeNull()
  })
})
