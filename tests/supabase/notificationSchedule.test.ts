import { describe, expect, it } from 'vitest'
import {
  getNotificationDeliveryKey,
  getScheduledNotifications,
  reconcileCycleUpdates,
} from '../../supabase/functions/_shared/schedule'
import { buildScheduledPayload } from '../../supabase/functions/_shared/messages'
import type { SubscriptionRow } from '../../supabase/functions/_shared/types'

function createSubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: 'subscription-id',
    user_id: 'user-id',
    endpoint: 'https://push.example/subscription',
    p256dh: 'p256dh',
    auth_key: 'auth',
    server_region: 'asia',
    locale: 'zh-CN',
    before_reset_revision: '11111111-1111-4111-8111-111111111111',
    reset_revision: '22222222-2222-4222-8222-222222222222',
    created_at: '2026-08-09T15:00:00.000Z',
    before_reset_enabled: true,
    reset_enabled: true,
    lead_hours: 6,
    daily_visible_total: 8,
    daily_incomplete: 3,
    daily_cycle_started_at: '2026-08-08T21:00:00.000Z',
    weekly_visible_total: 6,
    weekly_incomplete: 2,
    weekly_cycle_started_at: '2026-08-02T21:00:00.000Z',
    monthly_visible_total: 3,
    monthly_incomplete: 0,
    monthly_cycle_started_at: '2026-07-31T21:00:00.000Z',
    ...overrides,
  }
}

describe('notification schedule', () => {
  it('combines incomplete daily and weekly cycles at the shared reminder time', () => {
    const notifications = getScheduledNotifications(
      createSubscription(),
      new Date('2026-08-09T15:01:00.000Z'),
    )

    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      type: 'before-reset',
      cycles: ['daily', 'weekly'],
      counts: { daily: 3, weekly: 2 },
      scheduledFor: new Date('2026-08-09T15:00:00.000Z'),
      expiresAt: new Date('2026-08-09T21:00:00.000Z'),
    })
    expect(buildScheduledPayload(notifications[0], 'zh-CN', createSubscription()).body).toBe(
      '每日和每周还有未完成事项，请在重置前完成',
    )
    expect(getNotificationDeliveryKey(notifications[0], 'daily')).not.toBe(
      getNotificationDeliveryKey(notifications[0], 'weekly'),
    )
  })

  it('combines reset cycles and expires them at the next daily reset', () => {
    const notifications = getScheduledNotifications(
      createSubscription({ created_at: '2026-08-02T00:00:00.000Z' }),
      new Date('2026-08-09T21:00:30.000Z'),
    )

    expect(notifications[0]).toMatchObject({
      type: 'reset',
      cycles: ['daily', 'weekly'],
      expiresAt: new Date('2026-08-16T21:00:00.000Z'),
      cycleExpiresAt: {
        daily: new Date('2026-08-10T21:00:00.000Z'),
        weekly: new Date('2026-08-16T21:00:00.000Z'),
      },
    })
    expect(buildScheduledPayload(notifications[0], 'zh-CN', createSubscription()).body).toBe(
      '每日和每周事项已重置',
    )
  })

  it('backfills a reminder any time before its reset', () => {
    const notifications = getScheduledNotifications(
      createSubscription(),
      new Date('2026-08-09T18:00:00.000Z'),
    )
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({ type: 'before-reset', cycles: ['daily', 'weekly'] })
  })

  it('resets stale server counts to the visible total without task text', () => {
    const subscription = createSubscription({
      daily_cycle_started_at: '2026-08-02T21:00:00.000Z',
      daily_incomplete: 1,
    })
    const updates = reconcileCycleUpdates(subscription, new Date('2026-08-03T22:00:00.000Z'))

    expect(updates).toMatchObject({
      daily_incomplete: 8,
      daily_cycle_started_at: '2026-08-03T21:00:00.000Z',
    })
    expect(subscription.daily_incomplete).toBe(8)
  })
})
