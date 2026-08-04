import { describe, expect, it } from 'vitest'
import type { ChecklistData } from '../../src/types'
import {
  buildNotificationStats,
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  loadNotificationRuleRevisions,
  parseNotificationPreferences,
  rotateNotificationRuleRevision,
  saveNotificationPreferences,
} from '../../src/utils/notificationPreferences'

const data: ChecklistData = {
  daily: [
    { id: 'd1', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] },
    { id: 'd2', text: 'B', isCompleted: true, isHidden: false, order: 2, tags: [] },
    { id: 'd3', text: 'C', isCompleted: false, isHidden: true, order: 3, tags: [] },
  ],
  weekly: [],
  monthly: [],
  lastDailyReset: '2026-08-03T00:00:00.000Z',
  lastWeeklyReset: '2026-08-03T00:00:00.000Z',
  lastMonthlyReset: '2026-08-01T00:00:00.000Z',
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
}

describe('notificationPreferences', () => {
  it('disables incomplete task reminders by default', () => {
    expect(loadNotificationPreferences()).toEqual({
      beforeResetEnabled: false,
      resetEnabled: true,
      leadHours: 6,
    })
  })

  it('falls back field by field for malformed preferences', () => {
    expect(parseNotificationPreferences('{')).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
    expect(
      parseNotificationPreferences(
        JSON.stringify({ beforeResetEnabled: false, resetEnabled: 'yes', leadHours: 24 }),
      ),
    ).toEqual({ beforeResetEnabled: false, resetEnabled: true, leadHours: 6 })
  })

  it('creates and rotates independent rule revisions', () => {
    const initial = loadNotificationRuleRevisions()
    const nextBeforeReset = rotateNotificationRuleRevision('beforeReset')
    const next = loadNotificationRuleRevisions()

    expect(next.beforeReset).toBe(nextBeforeReset)
    expect(next.beforeReset).not.toBe(initial.beforeReset)
    expect(next.reset).toBe(initial.reset)
  })

  it('persists per-browser preferences', () => {
    const preferences = { beforeResetEnabled: false, resetEnabled: true, leadHours: 12 as const }
    saveNotificationPreferences(preferences)

    expect(loadNotificationPreferences()).toEqual(preferences)
  })

  it('builds counts from visible tasks and current scheduled cycles', () => {
    const stats = buildNotificationStats(data, new Date('2026-08-03T16:00:00.000Z'))

    expect(stats.daily).toEqual({
      visibleTotal: 2,
      incomplete: 1,
      cycleStartedAt: '2026-08-02T21:00:00.000Z',
    })
    expect(stats.weekly.visibleTotal).toBe(0)
    expect(stats.monthly.incomplete).toBe(0)
  })
})
