import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  NotificationPreferences,
  NotificationRuleRevisions,
  NotificationStats,
  ServerRegion,
} from '../types'
import type { SupportedLocale } from '../i18n/displayPreferences'
import type { NotificationPublicConfig } from './notificationConfig'

const SERVICE_WORKER_FILE = 'notification-sw.js'
const AUTH_STORAGE_KEY = 'flowboard-notification-auth'

interface NotificationSubscriptionPayload {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

export interface NotificationSyncPayload {
  subscription: NotificationSubscriptionPayload
  preferences: NotificationPreferences
  stats: NotificationStats
  serverRegion: ServerRegion
  locale: SupportedLocale
  revisions: NotificationRuleRevisions
}

let client: SupabaseClient | null = null
let cachedConfig: NotificationPublicConfig | null = null

export function isNotificationBrowserSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationBrowserSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationBrowserSupported()) return 'denied'
  return Notification.requestPermission()
}

export function getNotificationClient(config: NotificationPublicConfig): SupabaseClient {
  if (
    !client ||
    !cachedConfig ||
    cachedConfig.supabaseUrl !== config.supabaseUrl ||
    cachedConfig.supabasePublishableKey !== config.supabasePublishableKey
  ) {
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
    cachedConfig = config
  }
  return client
}

export function resetNotificationClient(): void {
  client = null
  cachedConfig = null
}

export async function ensureAnonymousSession(supabaseClient: SupabaseClient): Promise<void> {
  const { data, error } = await supabaseClient.auth.getSession()
  if (error) throw error
  if (data.session) return
  const result = await supabaseClient.auth.signInAnonymously()
  if (result.error) throw result.error
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isNotificationBrowserSupported()) throw new Error('NOTIFICATION_UNSUPPORTED')
  const scope = import.meta.env.BASE_URL
  return navigator.serviceWorker.register(`${scope}${SERVICE_WORKER_FILE}`, { scope })
}

export async function findNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isNotificationBrowserSupported()) return null
  return (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)) ?? null
}

export async function syncNotificationServiceWorkerState(state: {
  enabled: boolean
  beforeResetEnabled: boolean
  resetEnabled: boolean
  subscriptionId: string | null
  revisions: NotificationRuleRevisions
}): Promise<void> {
  if (!isNotificationBrowserSupported()) return
  const registration = await findNotificationServiceWorker()
  const worker = registration?.active ?? registration?.waiting ?? registration?.installing
  const { revisions, ...workerState } = state
  worker?.postMessage({
    type: 'notification-state',
    state: {
      ...workerState,
      beforeResetRevision: revisions.beforeReset,
      resetRevision: revisions.reset,
    },
  })
}

export async function subscribeToNotifications(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(vapidPublicKey),
  })
}

export async function syncNotificationSubscription(
  config: NotificationPublicConfig,
  payload: NotificationSyncPayload,
): Promise<void> {
  const supabaseClient = getNotificationClient(config)
  await ensureAnonymousSession(supabaseClient)
  const { error } = await supabaseClient.functions.invoke('notification-subscription', {
    body: { action: 'upsert', ...payload },
  })
  if (error) throw error
}

export async function deleteNotificationSubscription(
  config: NotificationPublicConfig,
): Promise<void> {
  const supabaseClient = getNotificationClient(config)
  await ensureAnonymousSession(supabaseClient)
  const { error } = await supabaseClient.functions.invoke('notification-subscription', {
    body: { action: 'delete' },
  })
  if (error) throw error
}

export async function sendNotificationTest(config: NotificationPublicConfig): Promise<void> {
  const supabaseClient = getNotificationClient(config)
  await ensureAnonymousSession(supabaseClient)
  const { error } = await supabaseClient.functions.invoke('notification-test', {
    body: {},
  })
  if (error) throw error
}

export function serializePushSubscription(
  subscription: PushSubscription,
): NotificationSubscriptionPayload {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('NOTIFICATION_SUBSCRIPTION_INVALID')
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  }
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}
