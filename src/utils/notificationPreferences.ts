import type {
  ChecklistData,
  ChecklistCycle,
  NotificationLeadHours,
  NotificationPreferences,
  NotificationRuleRevisions,
  NotificationStats,
} from '../types'
import { getResetSchedule } from './resetCalendar'

const NOTIFICATION_PREFERENCES_STORAGE_KEY = 'flowboard-notification-preferences'
const NOTIFICATION_BEFORE_RESET_REVISION_KEY = 'flowboard-notification-before-reset-revision'
const NOTIFICATION_RESET_REVISION_KEY = 'flowboard-notification-reset-revision'

export const NOTIFICATION_LEAD_HOURS: NotificationLeadHours[] = [1, 3, 6, 12]

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  beforeResetEnabled: false,
  resetEnabled: true,
  leadHours: 6,
}

export function parseNotificationPreferences(
  raw: string | null,
  defaults: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
): NotificationPreferences {
  if (!raw) return { ...defaults }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const leadHours = NOTIFICATION_LEAD_HOURS.includes(parsed.leadHours as NotificationLeadHours)
      ? (parsed.leadHours as NotificationLeadHours)
      : defaults.leadHours
    return {
      beforeResetEnabled:
        typeof parsed.beforeResetEnabled === 'boolean'
          ? parsed.beforeResetEnabled
          : defaults.beforeResetEnabled,
      resetEnabled:
        typeof parsed.resetEnabled === 'boolean' ? parsed.resetEnabled : defaults.resetEnabled,
      leadHours,
    }
  } catch {
    return { ...defaults }
  }
}

export function loadNotificationPreferences(
  storage: Storage | null = getStorage(),
): NotificationPreferences {
  return parseNotificationPreferences(
    storage?.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY) ?? null,
  )
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences,
  storage: Storage | null = getStorage(),
): void {
  storage?.setItem(NOTIFICATION_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
}

export function loadNotificationRuleRevisions(
  storage: Storage | null = getStorage(),
): NotificationRuleRevisions {
  const beforeReset = storage?.getItem(NOTIFICATION_BEFORE_RESET_REVISION_KEY) ?? null
  const reset = storage?.getItem(NOTIFICATION_RESET_REVISION_KEY) ?? null
  const revisions = {
    beforeReset: beforeReset ?? createRevision(),
    reset: reset ?? createRevision(),
  }
  if (storage) {
    storage.setItem(NOTIFICATION_BEFORE_RESET_REVISION_KEY, revisions.beforeReset)
    storage.setItem(NOTIFICATION_RESET_REVISION_KEY, revisions.reset)
  }
  return revisions
}

export function rotateNotificationRuleRevision(
  rule: keyof NotificationRuleRevisions,
  storage: Storage | null = getStorage(),
): string {
  const key =
    rule === 'beforeReset'
      ? NOTIFICATION_BEFORE_RESET_REVISION_KEY
      : NOTIFICATION_RESET_REVISION_KEY
  const revision = createRevision()
  storage?.setItem(key, revision)
  return revision
}

export function buildNotificationStats(data: ChecklistData, now = new Date()): NotificationStats {
  const cycles: ChecklistCycle[] = ['daily', 'weekly', 'monthly']
  return Object.fromEntries(
    cycles.map((cycle) => {
      const visibleItems = data[cycle].filter((item) => !item.isHidden)
      const schedule = getResetSchedule(cycle, data.settings.serverRegion, now)
      return [
        cycle,
        {
          visibleTotal: visibleItems.length,
          incomplete: visibleItems.filter((item) => !item.isCompleted).length,
          cycleStartedAt: schedule.previousResetAt.toISOString(),
        },
      ]
    }),
  ) as NotificationStats
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}

function createRevision(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const random = `${Date.now()}${Math.random()}`.replace(/\D/g, '').padEnd(12, '0').slice(-12)
  return `00000000-0000-4000-8000-${random}`
}
