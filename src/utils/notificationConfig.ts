export interface NotificationPublicConfig {
  enabled: boolean
  supabaseUrl: string
  supabasePublishableKey: string
  vapidPublicKey: string
}

export function loadNotificationPublicConfig(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): NotificationPublicConfig {
  const enabled = env.VITE_NOTIFICATION_ENABLED === 'true' || env.VITE_NOTIFICATION_ENABLED === true
  const supabaseUrl = String(env.VITE_NOTIFICATION_SUPABASE_URL ?? '').trim()
  const supabasePublishableKey = String(env.VITE_NOTIFICATION_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
  const vapidPublicKey = String(env.VITE_NOTIFICATION_VAPID_PUBLIC_KEY ?? '').trim()

  return { enabled, supabaseUrl, supabasePublishableKey, vapidPublicKey }
}

export function isNotificationConfigComplete(config: NotificationPublicConfig): boolean {
  return Boolean(
    config.enabled && config.supabaseUrl && config.supabasePublishableKey && config.vapidPublicKey,
  )
}
