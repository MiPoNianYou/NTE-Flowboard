import { getResetSchedule } from './resetCalendar.ts'
import type { Cycle, NotificationType, SubscriptionRow } from './types.ts'

const CYCLES: Cycle[] = ['daily', 'weekly', 'monthly']

export interface ScheduledNotification {
  type: Exclude<NotificationType, 'test'>
  cycles: Cycle[]
  counts: Partial<Record<Cycle, number>>
  scheduledFor: Date
  expiresAt: Date
  cycleScheduledAt: Partial<Record<Cycle, Date>>
  cycleExpiresAt: Partial<Record<Cycle, Date>>
}

export function getNotificationDeliveryKey(
  notification: ScheduledNotification,
  cycle: Cycle,
): string {
  const scheduledFor = notification.cycleScheduledAt[cycle] ?? notification.scheduledFor
  return `${notification.type}:${cycle}:${scheduledFor.toISOString()}`
}

export function reconcileCycleUpdates(subscription: SubscriptionRow, now: Date) {
  const updates: Record<string, number | string> = {}
  for (const cycle of CYCLES) {
    const expected = getResetSchedule(cycle, subscription.server_region, now).previousResetAt
    const stored = new Date(subscription[`${cycle}_cycle_started_at`])
    if (stored.getTime() === expected.getTime()) continue
    const visibleTotal = subscription[`${cycle}_visible_total`]
    updates[`${cycle}_incomplete`] = visibleTotal
    updates[`${cycle}_cycle_started_at`] = expected.toISOString()
    subscription[`${cycle}_incomplete`] = visibleTotal
    subscription[`${cycle}_cycle_started_at`] = expected.toISOString()
  }
  return updates
}

export function getScheduledNotifications(
  subscription: SubscriptionRow,
  now: Date,
): ScheduledNotification[] {
  const notifications: ScheduledNotification[] = []
  if (subscription.reset_enabled) {
    const schedules = CYCLES.map(
      (cycle) => [cycle, getResetSchedule(cycle, subscription.server_region, now)] as const,
    )
    const createdAt = new Date(subscription.created_at).getTime()
    const resetCycles = schedules
      .filter(([, schedule]) => schedule.previousResetAt.getTime() >= createdAt)
      .map(([cycle]) => cycle)
    if (resetCycles.length > 0) {
      const activeSchedules = schedules.filter(([cycle]) => resetCycles.includes(cycle))
      const scheduledFor = new Date(
        Math.min(...activeSchedules.map(([, schedule]) => schedule.previousResetAt.getTime())),
      )
      const cycleExpiresAt = Object.fromEntries(
        activeSchedules.map(([cycle, schedule]) => [cycle, schedule.nextResetAt]),
      ) as Partial<Record<Cycle, Date>>
      const cycleScheduledAt = Object.fromEntries(
        activeSchedules.map(([cycle, schedule]) => [cycle, schedule.previousResetAt]),
      ) as Partial<Record<Cycle, Date>>
      const expiresAt = new Date(
        Math.max(...activeSchedules.map(([, schedule]) => schedule.nextResetAt.getTime())),
      )
      notifications.push(
        createNotification(
          'reset',
          resetCycles,
          {},
          scheduledFor,
          expiresAt,
          cycleExpiresAt,
          cycleScheduledAt,
        ),
      )
    }
  }

  if (subscription.before_reset_enabled) {
    const groups = new Map<number, Cycle[]>()
    for (const cycle of CYCLES) {
      if (subscription[`${cycle}_incomplete`] <= 0) continue
      const schedule = getResetSchedule(cycle, subscription.server_region, now)
      const scheduledFor = new Date(
        schedule.nextResetAt.getTime() - subscription.lead_hours * 60 * 60 * 1000,
      )
      if (now < scheduledFor || now >= schedule.nextResetAt) continue
      const group = groups.get(schedule.nextResetAt.getTime()) ?? []
      group.push(cycle)
      groups.set(schedule.nextResetAt.getTime(), group)
    }

    for (const [resetTimestamp, cycles] of groups) {
      const scheduledFor = new Date(resetTimestamp - subscription.lead_hours * 60 * 60 * 1000)
      const counts = Object.fromEntries(
        cycles.map((cycle) => [cycle, subscription[`${cycle}_incomplete`]]),
      )
      notifications.push(
        createNotification(
          'before-reset',
          cycles,
          counts,
          scheduledFor,
          new Date(resetTimestamp),
          Object.fromEntries(cycles.map((cycle) => [cycle, new Date(resetTimestamp)])),
          Object.fromEntries(cycles.map((cycle) => [cycle, scheduledFor])),
        ),
      )
    }
  }

  return notifications
}

function createNotification(
  type: Exclude<NotificationType, 'test'>,
  cycles: Cycle[],
  counts: Partial<Record<Cycle, number>>,
  scheduledFor: Date,
  expiresAt: Date,
  cycleExpiresAt: Partial<Record<Cycle, Date>>,
  cycleScheduledAt: Partial<Record<Cycle, Date>>,
): ScheduledNotification {
  const normalizedCycles = [...cycles].sort(
    (left, right) => CYCLES.indexOf(left) - CYCLES.indexOf(right),
  )
  return {
    type,
    cycles: normalizedCycles,
    counts,
    scheduledFor,
    expiresAt,
    cycleScheduledAt,
    cycleExpiresAt,
  }
}
