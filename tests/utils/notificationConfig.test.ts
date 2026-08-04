import { describe, expect, it } from 'vitest'
import {
  isNotificationConfigComplete,
  loadNotificationPublicConfig,
} from '../../src/utils/notificationConfig'

describe('notificationConfig', () => {
  it('keeps the feature disabled when the flag is absent', () => {
    expect(loadNotificationPublicConfig({})).toEqual({
      enabled: false,
      supabaseUrl: '',
      supabasePublishableKey: '',
      vapidPublicKey: '',
    })
  })

  it('trims public configuration and validates completeness', () => {
    const config = loadNotificationPublicConfig({
      VITE_NOTIFICATION_ENABLED: 'true',
      VITE_NOTIFICATION_SUPABASE_URL: ' https://project.supabase.co ',
      VITE_NOTIFICATION_SUPABASE_PUBLISHABLE_KEY: ' key ',
      VITE_NOTIFICATION_VAPID_PUBLIC_KEY: ' vapid ',
    })

    expect(config).toEqual({
      enabled: true,
      supabaseUrl: 'https://project.supabase.co',
      supabasePublishableKey: 'key',
      vapidPublicKey: 'vapid',
    })
    expect(isNotificationConfigComplete(config)).toBe(true)
    expect(isNotificationConfigComplete({ ...config, vapidPublicKey: '' })).toBe(false)
  })
})
