import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistData, NotificationRuleRevisions } from '../../src/types'
import {
  createNotificationLifecycle,
  type NotificationBrowserAdapter,
  type NotificationLifecycleRuntime,
  type NotificationMetadataAdapter,
  type NotificationRemoteAdapter,
} from '../../src/utils/notificationLifecycle'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../src/utils/notificationPreferences'

const config = {
  enabled: true,
  supabaseUrl: 'https://notifications.supabase.co',
  supabasePublishableKey: 'publishable-key',
  vapidPublicKey: 'vapid-public-key',
}

const data: ChecklistData = {
  daily: [{ id: 'd1', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] }],
  weekly: [],
  monthly: [],
  lastDailyReset: '2026-08-03T00:00:00.000Z',
  lastWeeklyReset: '2026-08-03T00:00:00.000Z',
  lastMonthlyReset: '2026-08-01T00:00:00.000Z',
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
}

function createSubscription(endpoint: string): PushSubscription {
  return {
    endpoint,
    toJSON: () => ({
      endpoint,
      expirationTime: null,
      keys: { p256dh: 'p256dh', auth: 'auth' },
    }),
  } as unknown as PushSubscription
}

function createBrowser(initial: PushSubscription | null = null) {
  let subscription = initial
  const adapter: NotificationBrowserAdapter = {
    isSupported: vi.fn(() => true),
    getPermission: vi.fn(() => 'default' as const),
    requestPermission: vi.fn(async () => 'granted' as const),
    getSubscription: vi.fn(async () => subscription),
    subscribe: vi.fn(async () => {
      subscription = createSubscription('https://push.example/current')
      return subscription
    }),
    unsubscribe: vi.fn(async (current) => {
      if (subscription?.endpoint === current.endpoint) subscription = null
      return true
    }),
    updateWorkerState: vi.fn(async () => undefined),
  }
  return {
    adapter,
    getSubscription: () => subscription,
    replaceSubscription: (next: PushSubscription | null) => {
      subscription = next
    },
  }
}

function createMetadata(initialEndpoint: string | null = null) {
  let endpoint = initialEndpoint
  let pendingCleanup = false
  let preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES }
  let revisions: NotificationRuleRevisions = { beforeReset: 'before-0', reset: 'reset-0' }
  let revisionCounter = 0
  const rotations: Array<keyof NotificationRuleRevisions> = []
  const adapter: NotificationMetadataAdapter = {
    loadPreferences: () => preferences,
    savePreferences: (next) => {
      preferences = next
    },
    loadRevisions: () => revisions,
    rotateRevision: (rule) => {
      rotations.push(rule)
      const value = `${rule}-${++revisionCounter}`
      revisions = { ...revisions, [rule]: value }
      return value
    },
    loadEndpoint: () => endpoint,
    saveEndpoint: (next) => {
      endpoint = next
    },
    loadPendingCleanup: () => pendingCleanup,
    savePendingCleanup: (pending) => {
      pendingCleanup = pending
    },
  }
  return {
    adapter,
    rotations,
    isPendingCleanup: () => pendingCleanup,
  }
}

function createRemote(): NotificationRemoteAdapter {
  return {
    upsert: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    sendTest: vi.fn(async () => undefined),
  }
}

function createRuntime() {
  let online: (() => void) | null = null
  const runtime: NotificationLifecycleRuntime = {
    now: Date.now,
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
    setInterval: (callback, delay) => setInterval(callback, delay),
    clearInterval: (timer) => clearInterval(timer),
    subscribeOnline: (listener) => {
      online = listener
      return () => {
        online = null
      }
    },
  }
  return { runtime, triggerOnline: () => online?.() }
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

describe('createNotificationLifecycle', () => {
  beforeEach(() => vi.useFakeTimers())

  it('derives enabled state from the actual browser subscription', async () => {
    const subscription = createSubscription('https://push.example/current')
    const browser = createBrowser(subscription)
    const metadata = createMetadata(subscription.endpoint)
    const remote = createRemote()
    const lifecycle = createNotificationLifecycle({
      initialData: data,
      initialRegion: 'asia',
      initialLocale: 'zh-CN',
      config,
      browser: browser.adapter,
      metadata: metadata.adapter,
      remote,
      runtime: createRuntime().runtime,
    })

    lifecycle.start()
    await flushMicrotasks()

    expect(lifecycle.getSnapshot().status).toBe('enabled')
    expect(remote.upsert).toHaveBeenCalledOnce()
  })

  it('preserves a browser subscription when backend enablement fails', async () => {
    const browser = createBrowser()
    const metadata = createMetadata()
    const remote = createRemote()
    vi.mocked(remote.upsert).mockRejectedValueOnce(new Error('offline'))
    const lifecycle = createNotificationLifecycle({
      initialData: data,
      initialRegion: 'asia',
      initialLocale: 'zh-CN',
      config,
      browser: browser.adapter,
      metadata: metadata.adapter,
      remote,
      runtime: createRuntime().runtime,
    })
    lifecycle.start()
    await flushMicrotasks()

    await lifecycle.enable()
    expect(lifecycle.getSnapshot()).toMatchObject({
      status: 'error',
      error: 'NOTIFICATION_ENABLE_FAILED',
    })
    expect(browser.getSubscription()).not.toBeNull()
    expect(browser.adapter.unsubscribe).not.toHaveBeenCalled()

    await lifecycle.refresh()
    expect(lifecycle.getSnapshot().status).toBe('enabled')
  })

  it('disables locally before retaining failed remote cleanup for retry', async () => {
    const events: string[] = []
    const subscription = createSubscription('https://push.example/current')
    const browser = createBrowser(subscription)
    vi.mocked(browser.adapter.unsubscribe).mockImplementation(async () => {
      events.push('browser-unsubscribe')
      browser.replaceSubscription(null)
      return true
    })
    const metadata = createMetadata(subscription.endpoint)
    const remote = createRemote()
    vi.mocked(remote.remove).mockImplementationOnce(async () => {
      events.push('remote-remove')
      throw new Error('offline')
    })
    const runtime = createRuntime()
    const lifecycle = createNotificationLifecycle({
      initialData: data,
      initialRegion: 'asia',
      initialLocale: 'zh-CN',
      config,
      browser: browser.adapter,
      metadata: metadata.adapter,
      remote,
      runtime: runtime.runtime,
    })
    lifecycle.start()
    await flushMicrotasks()
    vi.mocked(remote.remove).mockClear()

    await lifecycle.disable()

    expect(events).toEqual(['browser-unsubscribe', 'remote-remove'])
    expect(lifecycle.getSnapshot()).toMatchObject({
      status: 'disabled',
      error: 'NOTIFICATION_DISABLE_SYNC_FAILED',
    })
    expect(metadata.isPendingCleanup()).toBe(true)
    expect(metadata.rotations).toEqual(['beforeReset', 'reset'])

    vi.mocked(remote.remove).mockResolvedValue(undefined)
    runtime.triggerOnline()
    await flushMicrotasks()
    expect(metadata.isPendingCleanup()).toBe(false)
  })

  it('rotates only the notification rules affected by each input', async () => {
    const subscription = createSubscription('https://push.example/current')
    const browser = createBrowser(subscription)
    const metadata = createMetadata(subscription.endpoint)
    const lifecycle = createNotificationLifecycle({
      initialData: data,
      initialRegion: 'asia',
      initialLocale: 'zh-CN',
      config,
      browser: browser.adapter,
      metadata: metadata.adapter,
      remote: createRemote(),
      runtime: createRuntime().runtime,
    })
    lifecycle.start()
    await flushMicrotasks()

    lifecycle.updatePreferences({ leadHours: 12 })
    expect(metadata.rotations).toEqual(['beforeReset'])
    lifecycle.updatePreferences({ resetEnabled: false })
    expect(metadata.rotations).toEqual(['beforeReset', 'reset'])
    lifecycle.updateContext(data, 'europe', 'zh-CN')
    expect(metadata.rotations).toEqual(['beforeReset', 'reset', 'beforeReset', 'reset'])

    metadata.rotations.length = 0
    browser.replaceSubscription(createSubscription('https://push.example/replaced'))
    await lifecycle.refresh()
    expect(metadata.rotations).toEqual(['beforeReset', 'reset'])
  })

  it('coalesces rapid context changes into one reconcile pass', async () => {
    const subscription = createSubscription('https://push.example/current')
    const browser = createBrowser(subscription)
    const remote = createRemote()
    const lifecycle = createNotificationLifecycle({
      initialData: data,
      initialRegion: 'asia',
      initialLocale: 'zh-CN',
      config,
      browser: browser.adapter,
      metadata: createMetadata(subscription.endpoint).adapter,
      remote,
      runtime: createRuntime().runtime,
    })
    lifecycle.start()
    await flushMicrotasks()
    vi.mocked(remote.upsert).mockClear()

    lifecycle.updateContext({ ...data, daily: [] }, 'asia', 'zh-CN')
    lifecycle.updateContext({ ...data, weekly: [] }, 'asia', 'en-US')
    lifecycle.updateContext({ ...data, monthly: [] }, 'asia', 'zh-CN')
    await vi.advanceTimersByTimeAsync(1000)

    expect(remote.upsert).toHaveBeenCalledOnce()
  })

  it('owns the test notification cooldown and success lifetime', async () => {
    const subscription = createSubscription('https://push.example/current')
    const lifecycle = createNotificationLifecycle({
      initialData: data,
      initialRegion: 'asia',
      initialLocale: 'zh-CN',
      config,
      browser: createBrowser(subscription).adapter,
      metadata: createMetadata(subscription.endpoint).adapter,
      remote: createRemote(),
      runtime: createRuntime().runtime,
    })
    lifecycle.start()
    await flushMicrotasks()

    await lifecycle.sendTest()
    expect(lifecycle.getSnapshot()).toMatchObject({
      testCountdownSeconds: 3,
      lastTestSucceeded: true,
    })
    await vi.advanceTimersByTimeAsync(3000)
    expect(lifecycle.getSnapshot().testCountdownSeconds).toBe(0)
    await vi.advanceTimersByTimeAsync(2000)
    expect(lifecycle.getSnapshot().lastTestSucceeded).toBe(false)
  })
})
