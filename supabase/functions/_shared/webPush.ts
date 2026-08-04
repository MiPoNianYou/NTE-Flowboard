import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from 'npm:@block65/webcrypto-web-push@1.0.2'
import type { PushPayload, SubscriptionRow } from './types.ts'

export async function sendWebPush(
  subscription: SubscriptionRow,
  payload: PushPayload,
  ttlSeconds: number,
): Promise<Response> {
  const vapid: VapidKeys = {
    subject: requiredEnv('VAPID_SUBJECT'),
    publicKey: requiredEnv('VAPID_PUBLIC_KEY'),
    privateKey: requiredEnv('VAPID_PRIVATE_KEY'),
  }
  const pushSubscription: PushSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: null,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
  }
  const request = await buildPushPayload(
    {
      data: JSON.stringify(payload),
      options: { ttl: Math.max(1, Math.floor(ttlSeconds)) },
    },
    pushSubscription,
    vapid,
  )
  const body = new Uint8Array(request.body.byteLength)
  body.set(request.body)
  return fetch(subscription.endpoint, { ...request, body: body.buffer })
}

export function isExpiredPushResponse(response: Response): boolean {
  return response.status === 404 || response.status === 410
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}
