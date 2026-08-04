import { adminClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/http.ts'
import { buildScheduledPayload } from '../_shared/messages.ts'
import {
  getScheduledNotifications,
  getNotificationDeliveryKey,
  reconcileCycleUpdates,
  type ScheduledNotification,
} from '../_shared/schedule.ts'
import { isExpiredPushResponse, sendWebPush } from '../_shared/webPush.ts'
import { updateNotificationDelivery } from '../_shared/deliveries.ts'
import type { SubscriptionRow } from '../_shared/types.ts'

const PAGE_SIZE = 500
const CONCURRENCY = 20

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  if (request.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return jsonResponse({ error: 'AUTH_REQUIRED' }, 401)
  }

  try {
    const now = new Date()
    const { data: systemConfig, error: configError } = await adminClient
      .from('notification_system_config')
      .select('delivery_enabled')
      .eq('id', true)
      .single()
    if (configError) throw configError

    let processed = 0
    let sent = 0
    let afterId = '00000000-0000-0000-0000-000000000000'
    for (;;) {
      const { data, error } = await adminClient
        .from('notification_subscriptions')
        .select('*')
        .order('id')
        .gt('id', afterId)
        .limit(PAGE_SIZE)
      if (error) throw error
      const subscriptions = (data ?? []) as SubscriptionRow[]
      if (subscriptions.length === 0) break
      afterId = subscriptions.at(-1)!.id

      for (let index = 0; index < subscriptions.length; index += CONCURRENCY) {
        const batch = subscriptions.slice(index, index + CONCURRENCY)
        const results = await Promise.all(
          batch.map((subscription) =>
            processSubscription(subscription, now, systemConfig.delivery_enabled),
          ),
        )
        sent += results.reduce((total, count) => total + count, 0)
        processed += batch.length
      }
      if (subscriptions.length < PAGE_SIZE) break
    }
    return jsonResponse({ ok: true, processed, sent })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return jsonResponse({ error: message }, 500)
  }
})

async function processSubscription(
  subscription: SubscriptionRow,
  now: Date,
  deliveryEnabled: boolean,
): Promise<number> {
  const cycleUpdates = reconcileCycleUpdates(subscription, now)
  if (Object.keys(cycleUpdates).length > 0) {
    const { error } = await adminClient
      .from('notification_subscriptions')
      .update(cycleUpdates)
      .eq('id', subscription.id)
    if (error) throw error
  }
  if (!deliveryEnabled) return 0

  let sent = 0
  for (const notification of getScheduledNotifications(subscription, now)) {
    sent += await deliver(subscription, notification, now)
  }
  return sent
}

async function deliver(
  subscription: SubscriptionRow,
  notification: ScheduledNotification,
  now: Date,
): Promise<number> {
  const claims: Array<{
    deliveryId: string
    attemptCount: number
    cycle: (typeof notification.cycles)[number]
  }> = []

  for (const cycle of notification.cycles) {
    const scheduledFor = notification.cycleScheduledAt[cycle] ?? notification.scheduledFor
    const expiresAt = notification.cycleExpiresAt[cycle] ?? notification.expiresAt
    const { data, error } = await adminClient.rpc('claim_notification_delivery', {
      p_subscription_id: subscription.id,
      p_delivery_key: getNotificationDeliveryKey(notification, cycle),
      p_notification_type: notification.type,
      p_scheduled_for: scheduledFor.toISOString(),
      p_expires_at: expiresAt.toISOString(),
    })
    if (error) throw error
    const claim = data?.[0] as { delivery_id: string; claimed_attempt_count: number } | undefined
    if (claim) {
      claims.push({
        deliveryId: claim.delivery_id,
        attemptCount: claim.claimed_attempt_count,
        cycle,
      })
    }
  }

  if (claims.length === 0) return 0

  const claimedNotification = {
    ...notification,
    cycles: claims.map(({ cycle }) => cycle),
  }

  try {
    const ttlSeconds = Math.max(
      1,
      Math.max(
        ...claims.map(({ cycle }) => {
          const expiresAt = notification.cycleExpiresAt[cycle] ?? notification.expiresAt
          return (expiresAt.getTime() - now.getTime()) / 1000
        }),
      ),
    )
    const payload = buildScheduledPayload(claimedNotification, subscription.locale, subscription)
    const response = await sendWebPush(subscription, payload, ttlSeconds)
    if (isExpiredPushResponse(response)) {
      await Promise.all(
        claims.map(({ deliveryId }) =>
          updateNotificationDelivery(deliveryId, 'permanent-failure', `PUSH_${response.status}`),
        ),
      )
      await adminClient.from('notification_subscriptions').delete().eq('id', subscription.id)
      return 0
    }
    if (!response.ok) {
      await Promise.all(
        claims.map(({ deliveryId, attemptCount }) =>
          updateNotificationDelivery(
            deliveryId,
            attemptCount >= 3 ? 'permanent-failure' : 'retry',
            `PUSH_${response.status}`,
          ),
        ),
      )
      return 0
    }
    await Promise.all(
      claims.map(({ deliveryId }) => updateNotificationDelivery(deliveryId, 'success', null)),
    )
    return 1
  } catch (error) {
    await Promise.all(
      claims.map(({ deliveryId, attemptCount }) =>
        updateNotificationDelivery(
          deliveryId,
          attemptCount >= 3 ? 'permanent-failure' : 'retry',
          error instanceof Error ? error.name : 'PUSH_ERROR',
        ),
      ),
    )
    return 0
  }
}
