import type { SupportedLocale } from '../types'
import type {
  ChecklistData,
  NotificationErrorCode,
  NotificationPreferences,
  NotificationRuleRevisions,
  NotificationSettingsProps,
  NotificationSystemStatus,
  ServerRegion,
} from '../types'
import { isNotificationConfigComplete, loadNotificationPublicConfig } from './notificationConfig'
import type { NotificationPublicConfig } from './notificationConfig'
import {
  buildNotificationStats,
  loadNotificationPreferences,
  loadNotificationRuleRevisions,
  rotateNotificationRuleRevision,
  saveNotificationPreferences,
} from './notificationPreferences'
import { removeStorageKey } from './legacyStorageMigration'
import { reportLegacyStorageFailure } from './legacyStorageEvents'
import {
  deleteNotificationSubscription,
  findNotificationServiceWorker,
  getNotificationPermission,
  isNotificationBrowserSupported,
  registerNotificationServiceWorker,
  requestNotificationPermission,
  sendNotificationTest,
  serializePushSubscription,
  subscribeToNotifications,
  syncNotificationServiceWorkerState,
  syncNotificationSubscription,
  type NotificationSyncPayload,
} from './notificationService'

const TEST_COUNTDOWN_MS = 3000
const TEST_SUCCESS_DISPLAY_MS = 5000
const SYNC_DEBOUNCE_MS = 1000
const ENDPOINT_STORAGE_KEY = 'flowboard-notification-endpoint'
const PENDING_CLEANUP_STORAGE_KEY = 'flowboard-notification-pending-cleanup'
const LEGACY_ENABLED_STORAGE_KEY = 'flowboard-notification-enabled'

export interface NotificationLifecycleSnapshot {
  available: boolean
  status: NotificationSystemStatus
  preferences: NotificationPreferences
  error: NotificationErrorCode | null
  testCountdownSeconds: number
  isTestSending: boolean
  lastTestSucceeded: boolean
  testFailed: boolean
}

export interface NotificationBrowserAdapter {
  isSupported: () => boolean
  getPermission: () => NotificationPermission | 'unsupported'
  requestPermission: () => Promise<NotificationPermission>
  getSubscription: () => Promise<PushSubscription | null>
  subscribe: (vapidPublicKey: string) => Promise<PushSubscription>
  unsubscribe: (subscription: PushSubscription) => Promise<boolean>
  updateWorkerState: (state: {
    enabled: boolean
    beforeResetEnabled: boolean
    resetEnabled: boolean
    subscriptionId: string | null
    revisions: NotificationRuleRevisions
  }) => Promise<void>
}

export interface NotificationRemoteAdapter {
  upsert: (payload: NotificationSyncPayload) => Promise<void>
  remove: () => Promise<void>
  sendTest: () => Promise<void>
}

export interface NotificationMetadataAdapter {
  loadPreferences: () => NotificationPreferences
  savePreferences: (preferences: NotificationPreferences) => void
  loadRevisions: () => NotificationRuleRevisions
  rotateRevision: (rule: keyof NotificationRuleRevisions) => string
  loadEndpoint: () => string | null
  saveEndpoint: (endpoint: string | null) => void
  loadPendingCleanup: () => boolean
  savePendingCleanup: (pending: boolean) => void
}

export interface NotificationLifecycleRuntime {
  now: () => number
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void
  setInterval: (callback: () => void, delay: number) => ReturnType<typeof setInterval>
  clearInterval: (timer: ReturnType<typeof setInterval>) => void
  subscribeOnline: (listener: () => void) => () => void
}

export interface NotificationLifecycleOptions {
  initialData: ChecklistData
  initialRegion: ServerRegion
  initialLocale: SupportedLocale
  config?: NotificationPublicConfig
  browser?: NotificationBrowserAdapter
  remote?: NotificationRemoteAdapter
  metadata?: NotificationMetadataAdapter
  runtime?: NotificationLifecycleRuntime
}

export interface NotificationLifecycle {
  getSnapshot: () => NotificationLifecycleSnapshot
  subscribe: (listener: () => void) => () => void
  start: () => void
  stop: () => void
  updateContext: (data: ChecklistData, region: ServerRegion, locale: SupportedLocale) => void
  updatePreferences: (partial: Partial<NotificationPreferences>) => void
  enable: () => Promise<void>
  disable: () => Promise<void>
  refresh: () => Promise<void>
  sendTest: () => Promise<void>
}

type ReconcileReason = 'enable' | 'sync' | 'disable'

function createInitialSnapshot(
  available: boolean,
  browser: NotificationBrowserAdapter,
  preferences: NotificationPreferences,
): NotificationLifecycleSnapshot {
  let status: NotificationSystemStatus = 'disabled'
  if (available && !browser.isSupported()) status = 'unsupported'
  else if (available && browser.getPermission() === 'denied') status = 'denied'
  else if (available) status = 'checking'
  return {
    available,
    status,
    preferences,
    error: null,
    testCountdownSeconds: 0,
    isTestSending: false,
    lastTestSucceeded: false,
    testFailed: false,
  }
}

export function createNotificationLifecycle(
  options: NotificationLifecycleOptions,
): NotificationLifecycle {
  const config = options.config ?? loadNotificationPublicConfig()
  const browser = options.browser ?? createNotificationBrowserAdapter()
  const remote = options.remote ?? createNotificationRemoteAdapter(config)
  const metadata = options.metadata ?? createNotificationMetadataAdapter()
  const runtime = options.runtime ?? createNotificationLifecycleRuntime()
  const available = isNotificationConfigComplete(config)
  let data = options.initialData
  let region = options.initialRegion
  let locale = options.initialLocale
  let revisions = metadata.loadRevisions()
  let subscription: PushSubscription | null = null
  let snapshot = createInitialSnapshot(available, browser, metadata.loadPreferences())
  let started = false
  let lifecycleVersion = 0
  let syncTimer: ReturnType<typeof setTimeout> | null = null
  let countdownTimer: ReturnType<typeof setInterval> | null = null
  let successTimer: ReturnType<typeof setTimeout> | null = null
  let testAvailableAt = 0
  let testInFlight = false
  let unsubscribeOnline: (() => void) | null = null
  let reconcilePromise: Promise<boolean> | null = null
  let reconcileRequested = false
  let reconcileReason: ReconcileReason = 'sync'
  const listeners = new Set<() => void>()

  const publish = (partial: Partial<NotificationLifecycleSnapshot>) => {
    snapshot = { ...snapshot, ...partial }
    listeners.forEach((listener) => listener())
  }

  const rotateRules = (beforeReset: boolean, reset: boolean) => {
    revisions = {
      beforeReset: beforeReset ? metadata.rotateRevision('beforeReset') : revisions.beforeReset,
      reset: reset ? metadata.rotateRevision('reset') : revisions.reset,
    }
  }

  const buildPayload = (): NotificationSyncPayload => ({
    subscription: serializePushSubscription(subscription!),
    preferences: snapshot.preferences,
    stats: buildNotificationStats({
      ...data,
      settings: { ...data.settings, serverRegion: region },
    }),
    serverRegion: region,
    locale,
    revisions,
  })

  const updateWorker = (enabled: boolean) =>
    browser.updateWorkerState({
      enabled,
      beforeResetEnabled: snapshot.preferences.beforeResetEnabled,
      resetEnabled: snapshot.preferences.resetEnabled,
      subscriptionId: enabled ? (subscription?.endpoint ?? null) : null,
      revisions,
    })

  const reconcileOnce = async (reason: ReconcileReason): Promise<boolean> => {
    try {
      if (metadata.loadPendingCleanup()) {
        await remote.remove()
        metadata.savePendingCleanup(false)
      }
      if (subscription) {
        await remote.upsert(buildPayload())
        await updateWorker(true)
        publish({ status: 'enabled', error: null })
      } else {
        await updateWorker(false)
        publish({ status: 'disabled', error: null })
      }
      return true
    } catch {
      const error: NotificationErrorCode =
        reason === 'enable'
          ? 'NOTIFICATION_ENABLE_FAILED'
          : reason === 'disable'
            ? 'NOTIFICATION_DISABLE_SYNC_FAILED'
            : 'NOTIFICATION_SYNC_FAILED'
      publish({ status: reason === 'enable' ? 'error' : snapshot.status, error })
      return false
    }
  }

  const requestReconcile = (reason: ReconcileReason): Promise<boolean> => {
    reconcileRequested = true
    if (reason === 'enable' || (reason === 'disable' && reconcileReason === 'sync')) {
      reconcileReason = reason
    }
    if (!reconcilePromise) {
      reconcilePromise = (async () => {
        let success = true
        while (reconcileRequested) {
          reconcileRequested = false
          const nextReason = reconcileReason
          reconcileReason = 'sync'
          success = (await reconcileOnce(nextReason)) && success
        }
        return success
      })().finally(() => {
        reconcilePromise = null
      })
    }
    return reconcilePromise
  }

  const scheduleReconcile = () => {
    if (!started || !subscription) return
    if (syncTimer) runtime.clearTimeout(syncTimer)
    syncTimer = runtime.setTimeout(() => {
      syncTimer = null
      void requestReconcile('sync')
    }, SYNC_DEBOUNCE_MS)
  }

  const refresh = async () => {
    if (!available) return
    const version = lifecycleVersion
    if (!browser.isSupported()) {
      publish({ status: 'unsupported' })
      return
    }
    const permission = browser.getPermission()
    if (permission === 'denied') {
      publish({ status: 'denied' })
      return
    }
    try {
      const nextSubscription = await browser.getSubscription()
      if (version !== lifecycleVersion) return
      const previousEndpoint = metadata.loadEndpoint()
      const nextEndpoint = nextSubscription?.endpoint ?? null
      if (previousEndpoint && previousEndpoint !== nextEndpoint) rotateRules(true, true)
      subscription = nextSubscription
      metadata.saveEndpoint(nextEndpoint)
      publish({ status: subscription ? 'enabled' : 'disabled', error: null })
      await requestReconcile('sync')
    } catch {
      if (version === lifecycleVersion) {
        publish({ status: 'error', error: 'NOTIFICATION_CHECK_FAILED' })
      }
    }
  }

  const enable = async () => {
    if (!available) return
    publish({ status: 'enabling', error: null })
    try {
      const permission = await browser.requestPermission()
      if (permission !== 'granted') {
        publish({ status: permission === 'denied' ? 'denied' : 'disabled' })
        return
      }
      const nextSubscription = await browser.subscribe(config.vapidPublicKey)
      const previousEndpoint = metadata.loadEndpoint()
      if (previousEndpoint && previousEndpoint !== nextSubscription.endpoint)
        rotateRules(true, true)
      subscription = nextSubscription
      metadata.saveEndpoint(nextSubscription.endpoint)
      await requestReconcile('enable')
    } catch {
      publish({ status: 'error', error: 'NOTIFICATION_ENABLE_FAILED' })
    }
  }

  const disable = async () => {
    publish({ error: null })
    const current = subscription
    try {
      if (current) await browser.unsubscribe(current)
    } catch {
      publish({ status: 'error', error: 'NOTIFICATION_DISABLE_FAILED' })
      return
    }

    subscription = null
    metadata.saveEndpoint(null)
    metadata.savePendingCleanup(true)
    rotateRules(true, true)
    publish({ status: 'disabled' })
    try {
      await updateWorker(false)
    } catch {
      publish({ error: 'NOTIFICATION_DISABLE_FAILED' })
    }
    await requestReconcile('disable')
  }

  const updatePreferences = (partial: Partial<NotificationPreferences>) => {
    const current = snapshot.preferences
    const next = { ...current, ...partial }
    const beforeResetChanged =
      next.beforeResetEnabled !== current.beforeResetEnabled || next.leadHours !== current.leadHours
    const resetChanged = next.resetEnabled !== current.resetEnabled
    if (!beforeResetChanged && !resetChanged) return
    metadata.savePreferences(next)
    rotateRules(beforeResetChanged, resetChanged)
    publish({ preferences: next })
    void updateWorker(Boolean(subscription)).catch(() => {
      publish({ error: 'NOTIFICATION_SYNC_FAILED' })
    })
    scheduleReconcile()
  }

  const updateContext = (
    nextData: ChecklistData,
    nextRegion: ServerRegion,
    nextLocale: SupportedLocale,
  ) => {
    if (nextRegion !== region) rotateRules(true, true)
    data = nextData
    region = nextRegion
    locale = nextLocale
    scheduleReconcile()
  }

  const updateCountdown = () => {
    const remaining = Math.max(0, Math.ceil((testAvailableAt - runtime.now()) / 1000))
    publish({ testCountdownSeconds: remaining })
    if (remaining === 0 && countdownTimer) {
      runtime.clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  const sendTestCommand = async () => {
    const currentTime = runtime.now()
    if (testInFlight || currentTime < testAvailableAt || !subscription) return
    testInFlight = true
    testAvailableAt = currentTime + TEST_COUNTDOWN_MS
    publish({
      testCountdownSeconds: 3,
      isTestSending: true,
      lastTestSucceeded: false,
      testFailed: false,
      error: null,
    })
    if (countdownTimer) runtime.clearInterval(countdownTimer)
    countdownTimer = runtime.setInterval(updateCountdown, 250)
    try {
      await remote.sendTest()
      publish({ lastTestSucceeded: true })
      if (successTimer) runtime.clearTimeout(successTimer)
      successTimer = runtime.setTimeout(() => {
        successTimer = null
        publish({ lastTestSucceeded: false })
      }, TEST_SUCCESS_DISPLAY_MS)
    } catch {
      publish({ testFailed: true })
    } finally {
      testInFlight = false
      publish({ isTestSending: false })
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: () => {
      if (started) return
      started = true
      lifecycleVersion += 1
      unsubscribeOnline = runtime.subscribeOnline(() => {
        void refresh()
      })
      void refresh()
    },
    stop: () => {
      started = false
      lifecycleVersion += 1
      if (syncTimer) runtime.clearTimeout(syncTimer)
      if (countdownTimer) runtime.clearInterval(countdownTimer)
      if (successTimer) runtime.clearTimeout(successTimer)
      syncTimer = null
      countdownTimer = null
      successTimer = null
      unsubscribeOnline?.()
      unsubscribeOnline = null
    },
    updateContext,
    updatePreferences,
    enable,
    disable,
    refresh,
    sendTest: sendTestCommand,
  }
}

function createNotificationBrowserAdapter(): NotificationBrowserAdapter {
  return {
    isSupported: isNotificationBrowserSupported,
    getPermission: getNotificationPermission,
    requestPermission: requestNotificationPermission,
    getSubscription: async () => {
      const registration = await findNotificationServiceWorker()
      return (await registration?.pushManager.getSubscription()) ?? null
    },
    subscribe: async (vapidPublicKey) => {
      const registration = await registerNotificationServiceWorker()
      return subscribeToNotifications(registration, vapidPublicKey)
    },
    unsubscribe: (current) => current.unsubscribe(),
    updateWorkerState: syncNotificationServiceWorkerState,
  }
}

function createNotificationRemoteAdapter(
  config: NotificationPublicConfig,
): NotificationRemoteAdapter {
  return {
    upsert: (payload) => syncNotificationSubscription(config, payload),
    remove: () => deleteNotificationSubscription(config),
    sendTest: () => sendNotificationTest(config),
  }
}

function createNotificationMetadataAdapter(): NotificationMetadataAdapter {
  const storage = typeof localStorage === 'undefined' ? null : localStorage
  if (
    storage &&
    !removeStorageKey(storage, LEGACY_ENABLED_STORAGE_KEY) &&
    storage.getItem(LEGACY_ENABLED_STORAGE_KEY) !== null
  ) {
    reportLegacyStorageFailure()
  }
  return {
    loadPreferences: () => loadNotificationPreferences(storage),
    savePreferences: (preferences) => saveNotificationPreferences(preferences, storage),
    loadRevisions: () => loadNotificationRuleRevisions(storage),
    rotateRevision: (rule) => rotateNotificationRuleRevision(rule, storage),
    loadEndpoint: () => storage?.getItem(ENDPOINT_STORAGE_KEY) ?? null,
    saveEndpoint: (endpoint) => {
      if (!storage) return
      if (endpoint) storage.setItem(ENDPOINT_STORAGE_KEY, endpoint)
      else storage.removeItem(ENDPOINT_STORAGE_KEY)
    },
    loadPendingCleanup: () => storage?.getItem(PENDING_CLEANUP_STORAGE_KEY) === 'true',
    savePendingCleanup: (pending) => {
      if (!storage) return
      if (pending) storage.setItem(PENDING_CLEANUP_STORAGE_KEY, 'true')
      else storage.removeItem(PENDING_CLEANUP_STORAGE_KEY)
    },
  }
}

function createNotificationLifecycleRuntime(): NotificationLifecycleRuntime {
  return {
    now: Date.now,
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
    setInterval: (callback, delay) => setInterval(callback, delay),
    clearInterval: (timer) => clearInterval(timer),
    subscribeOnline: (listener) => {
      window.addEventListener('online', listener)
      return () => window.removeEventListener('online', listener)
    },
  }
}

export function toNotificationSettingsProps(
  lifecycle: NotificationLifecycle,
  snapshot: NotificationLifecycleSnapshot,
): NotificationSettingsProps {
  return {
    status: snapshot.status,
    preferences: snapshot.preferences,
    error: snapshot.error,
    testCountdownSeconds: snapshot.testCountdownSeconds,
    isTestSending: snapshot.isTestSending,
    lastTestSucceeded: snapshot.lastTestSucceeded,
    testFailed: snapshot.testFailed,
    updatePreferences: lifecycle.updatePreferences,
    enable: lifecycle.enable,
    disable: lifecycle.disable,
    refresh: lifecycle.refresh,
    sendTest: lifecycle.sendTest,
  }
}
