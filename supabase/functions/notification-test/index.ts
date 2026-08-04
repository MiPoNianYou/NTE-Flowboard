import { adminClient, requireUser } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/http.ts'
import { buildTestPayload } from '../_shared/messages.ts'
import { isExpiredPushResponse, sendWebPush } from '../_shared/webPush.ts'
import { updateNotificationDelivery } from '../_shared/deliveries.ts'
import type { SubscriptionRow } from '../_shared/types.ts'

const TEST_SEND_DELAY_MS = 3000

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)

  try {
    const user = await requireUser(request)
    const { data: claimed, error: claimError } = await adminClient.rpc('claim_notification_test', {
      p_user_id: user.id,
    })
    if (claimError) throw claimError
    if (!claimed) return jsonResponse({ error: 'TEST_COOLDOWN' }, 429)

    const { data, error } = await adminClient
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (error) throw error
    const subscription = data as SubscriptionRow
    const scheduledFor = new Date()
    const expiresAt = new Date(scheduledFor.getTime() + 60_000)
    const { data: delivery, error: deliveryError } = await adminClient
      .from('notification_deliveries')
      .insert({
        subscription_id: subscription.id,
        delivery_key: `test:${scheduledFor.toISOString()}`,
        notification_type: 'test',
        scheduled_for: scheduledFor.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'sending',
      })
      .select('id')
      .single()
    if (deliveryError) throw deliveryError

    await delay(TEST_SEND_DELAY_MS)

    const response = await sendWebPush(
      subscription,
      buildTestPayload(subscription.locale, expiresAt, subscription),
      60,
    )
    if (isExpiredPushResponse(response)) {
      await updateNotificationDelivery(delivery.id, 'permanent-failure', `PUSH_${response.status}`)
      await adminClient.from('notification_subscriptions').delete().eq('id', subscription.id)
      return jsonResponse({ error: 'SUBSCRIPTION_EXPIRED' }, 410)
    }
    if (!response.ok) {
      await updateNotificationDelivery(delivery.id, 'permanent-failure', `PUSH_${response.status}`)
      return jsonResponse({ error: `PUSH_${response.status}` }, 502)
    }
    await updateNotificationDelivery(delivery.id, 'success', null)
    return jsonResponse({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return jsonResponse({ error: message }, message === 'AUTH_REQUIRED' ? 401 : 500)
  }
})

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
