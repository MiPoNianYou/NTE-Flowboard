import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ensureAnonymousSession,
  findNotificationServiceWorker,
  getNotificationClient,
  getNotificationPermission,
  isNotificationBrowserSupported,
  requestNotificationPermission,
  resetNotificationClient,
  serializePushSubscription,
  subscribeToNotifications,
  syncNotificationServiceWorkerState,
} from '../../src/utils/notificationService'

function installBrowserSupport() {
  const requestPermission = vi.fn().mockResolvedValue('granted')
  vi.stubGlobal('Notification', { permission: 'default', requestPermission })
  vi.stubGlobal('PushManager', class {})
  const getRegistration = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration, register: vi.fn() },
  })
  return { getRegistration, requestPermission }
}

describe('notificationService', () => {
  afterEach(() => {
    resetNotificationClient()
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined })
  })

  it('detects unsupported and supported browsers', async () => {
    expect(isNotificationBrowserSupported()).toBe(false)
    expect(getNotificationPermission()).toBe('unsupported')

    const { requestPermission } = installBrowserSupport()
    expect(isNotificationBrowserSupported()).toBe(true)
    expect(getNotificationPermission()).toBe('default')
    await expect(requestNotificationPermission()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledOnce()
  })

  it('finds an existing registration and creates a subscription with the VAPID key', async () => {
    const { getRegistration } = installBrowserSupport()
    const pushSubscription = { endpoint: 'https://push.example/subscription' }
    const subscribe = vi.fn().mockResolvedValue(pushSubscription)
    const registration = {
      pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe },
    } as unknown as ServiceWorkerRegistration
    getRegistration.mockResolvedValue(registration)

    await expect(findNotificationServiceWorker()).resolves.toBe(registration)
    await expect(subscribeToNotifications(registration, 'AQID')).resolves.toBe(pushSubscription)
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(ArrayBuffer),
    })
  })

  it('serializes only complete push subscriptions', () => {
    const valid = {
      toJSON: () => ({
        endpoint: 'https://push.example/subscription',
        expirationTime: null,
        keys: { p256dh: 'p256dh', auth: 'auth' },
      }),
    } as unknown as PushSubscription
    expect(serializePushSubscription(valid)).toEqual({
      endpoint: 'https://push.example/subscription',
      expirationTime: null,
      keys: { p256dh: 'p256dh', auth: 'auth' },
    })
    expect(() =>
      serializePushSubscription({ toJSON: () => ({}) } as unknown as PushSubscription),
    ).toThrow('NOTIFICATION_SUBSCRIPTION_INVALID')
  })

  it('sends the revision fields expected by the service worker', async () => {
    const { getRegistration } = installBrowserSupport()
    const postMessage = vi.fn()
    getRegistration.mockResolvedValue({ active: { postMessage } })

    await syncNotificationServiceWorkerState({
      enabled: true,
      beforeResetEnabled: true,
      resetEnabled: true,
      subscriptionId: 'https://push.example/subscription',
      revisions: { beforeReset: 'before-reset-1', reset: 'reset-1' },
    })

    expect(postMessage).toHaveBeenCalledWith({
      type: 'notification-state',
      state: {
        enabled: true,
        beforeResetEnabled: true,
        resetEnabled: true,
        subscriptionId: 'https://push.example/subscription',
        beforeResetRevision: 'before-reset-1',
        resetRevision: 'reset-1',
      },
    })
  })

  it('creates one isolated Supabase client and anonymous session', async () => {
    const config = {
      enabled: true,
      supabaseUrl: 'https://project.supabase.co',
      supabasePublishableKey: 'publishable-key',
      vapidPublicKey: 'vapid',
    }
    expect(getNotificationClient(config)).toBe(getNotificationClient(config))

    const signInAnonymously = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInAnonymously,
      },
    } as unknown as SupabaseClient
    await ensureAnonymousSession(client)
    expect(signInAnonymously).toHaveBeenCalledOnce()
  })
})
