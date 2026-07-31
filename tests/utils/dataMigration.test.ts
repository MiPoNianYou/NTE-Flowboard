import { describe, expect, it, vi } from 'vitest'
import type { ChecklistData } from '../../src/types'
import { migrateDataStructure, mergeChecklistData } from '../../src/utils/dataMigration'

describe('migrateDataStructure', () => {
  it.each([null, undefined, 'legacy', 1])('leaves non-object input unchanged: %p', (value) => {
    expect(migrateDataStructure(value)).toBe(value)
  })

  it('prefers modern fields while removing all legacy settings and reset fields', () => {
    const migrated = migrateDataStructure({
      daily: [],
      weekly: [],
      monthly: [],
      custom: [],
      resetConfig: { serverRegion: 'europe' },
      settings: {
        serverRegion: 'america',
        isAutoMoveEnabled: true,
        shouldConfirmDelete: true,
        autoMoveCompleted: false,
        confirmDelete: false,
        showCustomTab: true,
      },
      lastMonthlyReset: 'modern',
      lastCustomReset: 'legacy',
      customResetMode: 'legacy',
    }) as Record<string, unknown>

    expect(migrated.settings).toEqual({
      serverRegion: 'america',
      isAutoMoveEnabled: true,
      shouldConfirmDelete: true,
    })
    expect(migrated.lastMonthlyReset).toBe('modern')
    expect(migrated).not.toHaveProperty('custom')
    expect(migrated).not.toHaveProperty('resetConfig')
    expect(migrated).not.toHaveProperty('lastCustomReset')
    expect(migrated).not.toHaveProperty('customResetMode')
  })

  it('moves a populated custom list to monthly and supplies defaults for an empty legacy list', () => {
    const populated = migrateDataStructure({
      daily: [],
      weekly: [],
      monthly: [{ text: 'Old monthly' }],
      custom: [{ text: 'Legacy custom', completed: false, order: 1 }],
    }) as Record<string, unknown>
    const empty = migrateDataStructure({ daily: [], weekly: [], custom: [] }) as Record<
      string,
      unknown
    >

    expect(populated.monthly).toEqual([
      { text: 'Legacy custom', isCompleted: false, isHidden: false, order: 1 },
    ])
    expect(empty.monthly).toEqual(expect.any(Array))
    expect((empty.monthly as unknown[]).length).toBeGreaterThan(0)
  })
})

describe('mergeChecklistData', () => {
  it('preserves explicit false preferences and existing timestamps', () => {
    const input = {
      daily: [],
      weekly: [],
      monthly: [],
      settings: {
        serverRegion: 'europe',
        isAutoMoveEnabled: false,
        shouldConfirmDelete: false,
      },
      uiPreferences: { cloudPatchHidden: true },
      lastDailyReset: 'daily',
      lastWeeklyReset: 'weekly',
      lastMonthlyReset: 'monthly',
    } satisfies ChecklistData

    expect(mergeChecklistData(input)).toEqual(input)
  })

  it('fills absent settings, UI preferences, and timestamps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'))
    const merged = mergeChecklistData({
      daily: [],
      weekly: [],
      monthly: [],
    } as unknown as ChecklistData)

    expect(merged.settings).toEqual({
      serverRegion: 'asia',
      isAutoMoveEnabled: true,
      shouldConfirmDelete: true,
    })
    expect(merged.uiPreferences).toEqual({ cloudPatchHidden: false })
    expect(merged.lastDailyReset).toBe('2026-07-10T12:00:00.000Z')
    expect(merged.lastWeeklyReset).toBe('2026-07-10T12:00:00.000Z')
    expect(merged.lastMonthlyReset).toBe('2026-07-10T12:00:00.000Z')
  })
})
