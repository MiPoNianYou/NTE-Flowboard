import type { ChecklistData, SyncStatus } from '../types'
import type { ChecklistSynchronizationPort } from './checklistController'
import { MS } from './constants'
import { createDefaultChecklistData, DEFAULT_CHECKLIST_DATA } from './defaultData'
import { toOrderedData } from './serialization'
import {
  classifySyncError,
  clearSyncConfig,
  loadLastSeenTime,
  loadLastSyncTime,
  loadSupabaseConfig,
  pullData,
  pushData,
  resetClient,
  saveLastSeenTime,
  saveLastSyncTime,
  saveSupabaseConfig,
  subscribeToChanges,
  validateConfig,
  type SupabaseConfig,
  type ValidateResult,
} from './supabase'
import i18n from '../i18n'

type RetryKind = 'pull' | 'push'
type SyncIntentKind = 'pull' | 'push' | 'sync'

interface SyncIntent {
  kind: SyncIntentKind
  forcePull: boolean
  skipFirstImport: boolean
}

interface PullResult {
  succeeded: boolean
  imported: boolean
  merged: boolean
}

export interface CloudSynchronizationSnapshot {
  isConfigured: boolean
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  hasPendingLocalChanges: boolean
}

export type CloudSynchronizationCommandResult = { ok: true } | { ok: false; error: string }

export interface CloudSynchronizationRemoteAdapter {
  validate: (projectUrl: string, anonKey: string) => Promise<ValidateResult>
  pull: (config: SupabaseConfig) => Promise<{ data: ChecklistData; updatedAt: string } | null>
  push: (config: SupabaseConfig, data: Record<string, unknown>) => Promise<string>
  subscribe: (config: SupabaseConfig, onChange: () => void) => (() => void) | null
  reset: () => void
  classifyError: (error: unknown) => string
  isRetryableError: (error: unknown) => boolean
}

export interface CloudSynchronizationMetadataAdapter {
  loadConfig: () => SupabaseConfig | null
  saveConfig: (config: SupabaseConfig) => void
  clearConfig: () => void
  loadLastSyncTime: () => string | null
  saveLastSyncTime: (isoString: string) => void
  loadLastSeenTime: () => string | null
  saveLastSeenTime: (isoString: string) => void
}

export interface CloudSynchronizationRuntime {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void
  setInterval: (callback: () => void, delay: number) => ReturnType<typeof setInterval>
  clearInterval: (timer: ReturnType<typeof setInterval>) => void
  isDocumentHidden: () => boolean
  subscribeOnline: (listener: () => void) => () => void
  subscribeVisibility: (listener: () => void) => () => void
  subscribeCrossTab: (listener: () => void) => () => void
  broadcast: (updatedAt: string) => void
  now: () => Date
}

export interface CloudSynchronizationOptions {
  initialData: ChecklistData
  getChecklistPort: () => ChecklistSynchronizationPort | undefined
  onDataImport: (data: ChecklistData) => void
  remote?: CloudSynchronizationRemoteAdapter
  metadata?: CloudSynchronizationMetadataAdapter
  runtime?: CloudSynchronizationRuntime
}

export interface CloudSynchronization {
  getSnapshot: () => CloudSynchronizationSnapshot
  subscribe: (listener: () => void) => () => void
  start: () => void
  stop: () => void
  updateLocalData: (data: ChecklistData) => void
  configure: (projectUrl: string, anonKey: string) => Promise<CloudSynchronizationCommandResult>
  syncNow: () => Promise<CloudSynchronizationCommandResult>
  disconnect: () => void
  clearError: () => void
}

const RETRY_DELAYS = [MS.ERROR_RECOVERY, MS.ERROR_RECOVERY * 3, MS.ERROR_RECOVERY * 9] as const
const CROSS_TAB_SYNC_KEY = 'flowboard-sync-event'
const CROSS_TAB_CHANNEL = 'flowboard-sync'

export function createCloudSynchronization({
  initialData,
  getChecklistPort,
  onDataImport,
  remote = createSupabaseRemoteAdapter(),
  metadata = createBrowserMetadataAdapter(),
  runtime = createBrowserCloudSynchronizationRuntime(),
}: CloudSynchronizationOptions): CloudSynchronization {
  let config = metadata.loadConfig()
  let configVersion = 0
  let currentData = initialData
  let dataInitialized = false
  let localChangeVersion = 0
  let ignoreNextDataUpdate = false
  let lastSeenTime = metadata.loadLastSeenTime()
  let snapshot: CloudSynchronizationSnapshot = {
    isConfigured: Boolean(config),
    syncStatus: config ? 'connecting' : 'disconnected',
    lastSyncTime: metadata.loadLastSyncTime(),
    syncError: null,
    hasPendingLocalChanges: false,
  }
  let started = false
  let terminalError = false
  let desiredIntent: SyncIntent | null = null
  let drainPromise: Promise<CloudSynchronizationCommandResult> | null = null
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let realtimeTimer: ReturnType<typeof setTimeout> | null = null
  let periodicTimer: ReturnType<typeof setInterval> | null = null
  let retryAttempt = 0
  let unsubscribeOnline: (() => void) | null = null
  let unsubscribeVisibility: (() => void) | null = null
  let unsubscribeCrossTab: (() => void) | null = null
  let unsubscribeRemote: (() => void) | null = null
  const listeners = new Set<() => void>()

  const updateSnapshot = (partial: Partial<CloudSynchronizationSnapshot>) => {
    const next = { ...snapshot, ...partial }
    if (
      next.isConfigured === snapshot.isConfigured &&
      next.syncStatus === snapshot.syncStatus &&
      next.lastSyncTime === snapshot.lastSyncTime &&
      next.syncError === snapshot.syncError &&
      next.hasPendingLocalChanges === snapshot.hasPendingLocalChanges
    ) {
      return
    }
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  const clearTimer = (timer: ReturnType<typeof setTimeout> | null) => {
    if (timer !== null) runtime.clearTimeout(timer)
  }

  const clearIntervalTimer = (timer: ReturnType<typeof setInterval> | null) => {
    if (timer !== null) runtime.clearInterval(timer)
  }

  const resetRetries = () => {
    retryAttempt = 0
    clearTimer(retryTimer)
    retryTimer = null
  }

  const saveSuccessfulSync = (updatedAt: string) => {
    const syncedAt = runtime.now().toISOString()
    lastSeenTime = updatedAt
    metadata.saveLastSeenTime(updatedAt)
    metadata.saveLastSyncTime(syncedAt)
    updateSnapshot({
      lastSyncTime: syncedAt,
      syncStatus: 'connected',
      syncError: null,
    })
    terminalError = false
    resetRetries()
  }

  const fail = (error: unknown, retryKind: RetryKind) => {
    const message = remote.classifyError(error)
    terminalError = !remote.isRetryableError(error)
    updateSnapshot({ syncStatus: 'error', syncError: message })
    if (terminalError || !started || !config) return

    clearTimer(retryTimer)
    const delay = RETRY_DELAYS[Math.min(retryAttempt, RETRY_DELAYS.length - 1)]
    retryTimer = runtime.setTimeout(() => {
      retryTimer = null
      retryAttempt += 1
      void enqueue({
        kind: retryKind,
        forcePull: retryKind === 'pull',
        skipFirstImport: false,
      })
    }, delay)
  }

  const shouldImportRemote = (updatedAt: string, skipFirstImport: boolean) => {
    const remoteTime = new Date(updatedAt)
    if (skipFirstImport) return Boolean(lastSeenTime && remoteTime > new Date(lastSeenTime))
    return !lastSeenTime || remoteTime > new Date(lastSeenTime)
  }

  const performPush = async (
    activeConfig: SupabaseConfig,
    activeConfigVersion: number,
  ): Promise<CloudSynchronizationCommandResult> => {
    const checklistPort = getChecklistPort()
    const captured = checklistPort?.captureSnapshot()
    const capturedLocalVersion = localChangeVersion

    try {
      const updatedAt = await remote.push(
        activeConfig,
        toOrderedData(captured?.data ?? currentData),
      )
      if (activeConfigVersion !== configVersion) return { ok: false, error: 'cancelled' }

      checklistPort?.acknowledgeOperationsThrough(captured?.operationVersion ?? 0)
      if (capturedLocalVersion === localChangeVersion) {
        updateSnapshot({ hasPendingLocalChanges: false })
      } else {
        updateSnapshot({ hasPendingLocalChanges: true })
        desiredIntent = mergeIntents(desiredIntent, {
          kind: 'push',
          forcePull: false,
          skipFirstImport: false,
        })
      }
      saveSuccessfulSync(updatedAt)
      runtime.broadcast(updatedAt)
      return { ok: true }
    } catch (error) {
      if (activeConfigVersion !== configVersion) return { ok: false, error: 'cancelled' }
      fail(error, 'push')
      return { ok: false, error: remote.classifyError(error) }
    }
  }

  const applyRemoteData = async (data: ChecklistData) => {
    const checklistPort = getChecklistPort()
    clearTimer(pushTimer)
    pushTimer = null
    ignoreNextDataUpdate = true
    if (checklistPort) return checklistPort.applyRemoteSnapshot(structuredClone(data))
    onDataImport(structuredClone(data))
    return { outcome: 'applied' as const, skippedOperations: 0 }
  }

  const performPull = async (
    activeConfig: SupabaseConfig,
    activeConfigVersion: number,
    force: boolean,
    skipFirstImport: boolean,
  ): Promise<PullResult> => {
    if (!force && snapshot.hasPendingLocalChanges) {
      return { succeeded: true, imported: false, merged: false }
    }

    try {
      const result = await remote.pull(activeConfig)
      if (activeConfigVersion !== configVersion) {
        return { succeeded: false, imported: false, merged: false }
      }
      if (!result) {
        updateSnapshot({ syncStatus: 'connected', syncError: null })
        terminalError = false
        resetRetries()
        return { succeeded: true, imported: false, merged: false }
      }

      let imported = false
      let merged = false
      if (shouldImportRemote(result.updatedAt, skipFirstImport)) {
        const applied = await applyRemoteData(result.data)
        if (activeConfigVersion !== configVersion) {
          return { succeeded: false, imported: false, merged: false }
        }
        imported = applied.outcome !== 'ignored'
        merged = applied.outcome === 'merged'
        if (imported) updateSnapshot({ hasPendingLocalChanges: merged })
      }

      saveSuccessfulSync(
        !lastSeenTime || new Date(result.updatedAt) > new Date(lastSeenTime)
          ? result.updatedAt
          : lastSeenTime,
      )
      return { succeeded: true, imported, merged }
    } catch (error) {
      if (activeConfigVersion !== configVersion) {
        return { succeeded: false, imported: false, merged: false }
      }
      fail(error, 'pull')
      return { succeeded: false, imported: false, merged: false }
    }
  }

  const execute = async (intent: SyncIntent): Promise<CloudSynchronizationCommandResult> => {
    if (!config) {
      updateSnapshot({ syncStatus: 'disconnected' })
      return { ok: false, error: i18n.t('sync.failed') }
    }
    const activeConfig = config
    const activeConfigVersion = configVersion
    updateSnapshot({ syncStatus: 'syncing' })

    if (intent.kind === 'push') return performPush(activeConfig, activeConfigVersion)

    const pullResult = await performPull(
      activeConfig,
      activeConfigVersion,
      intent.forcePull,
      intent.skipFirstImport,
    )
    if (!pullResult.succeeded)
      return { ok: false, error: snapshot.syncError ?? i18n.t('sync.failed') }
    if (pullResult.merged) return performPush(activeConfig, activeConfigVersion)
    if (intent.kind === 'sync' && !pullResult.imported) {
      return performPush(activeConfig, activeConfigVersion)
    }
    return { ok: true }
  }

  const drain = async (): Promise<CloudSynchronizationCommandResult> => {
    let result: CloudSynchronizationCommandResult = { ok: true }
    while (desiredIntent) {
      const intent = desiredIntent
      desiredIntent = null
      result = await execute(intent)
    }
    return result
  }

  function enqueue(intent: SyncIntent): Promise<CloudSynchronizationCommandResult> {
    desiredIntent = mergeIntents(desiredIntent, intent)
    if (!drainPromise) {
      drainPromise = drain().finally(() => {
        drainPromise = null
        if (desiredIntent) void enqueue(desiredIntent)
      })
    }
    return drainPromise
  }

  const schedulePush = () => {
    clearTimer(pushTimer)
    pushTimer = runtime.setTimeout(() => {
      pushTimer = null
      void enqueue({ kind: 'push', forcePull: false, skipFirstImport: false })
    }, MS.PUSH_DEBOUNCE)
  }

  const stopPeriodicPull = () => {
    clearIntervalTimer(periodicTimer)
    periodicTimer = null
  }

  const startPeriodicPull = () => {
    stopPeriodicPull()
    if (!started || !config || runtime.isDocumentHidden() || terminalError) return
    periodicTimer = runtime.setInterval(() => {
      if (!runtime.isDocumentHidden()) {
        void enqueue({ kind: 'pull', forcePull: false, skipFirstImport: false })
      }
    }, MS.PERIODIC_PULL)
  }

  const stopRemoteSubscription = () => {
    unsubscribeRemote?.()
    unsubscribeRemote = null
    clearTimer(realtimeTimer)
    realtimeTimer = null
  }

  const startRemoteSubscription = () => {
    stopRemoteSubscription()
    if (!config || terminalError) return
    unsubscribeRemote = remote.subscribe(config, () => {
      clearTimer(realtimeTimer)
      realtimeTimer = runtime.setTimeout(() => {
        realtimeTimer = null
        void enqueue({ kind: 'pull', forcePull: true, skipFirstImport: false })
      }, MS.REALTIME_DEBOUNCE)
    })
  }

  const connectRuntime = () => {
    if (unsubscribeOnline) return
    unsubscribeOnline = runtime.subscribeOnline(() => {
      if (!config || terminalError) return
      void enqueue({
        kind: snapshot.hasPendingLocalChanges ? 'push' : 'pull',
        forcePull: !snapshot.hasPendingLocalChanges,
        skipFirstImport: false,
      })
    })
    unsubscribeVisibility = runtime.subscribeVisibility(() => {
      if (runtime.isDocumentHidden()) {
        stopPeriodicPull()
        return
      }
      if (config && !terminalError) {
        void enqueue({ kind: 'pull', forcePull: false, skipFirstImport: false })
      }
      startPeriodicPull()
    })
    unsubscribeCrossTab = runtime.subscribeCrossTab(() => {
      if (config && !terminalError) {
        void enqueue({ kind: 'pull', forcePull: true, skipFirstImport: false })
      }
    })
  }

  const disconnectRuntime = () => {
    unsubscribeOnline?.()
    unsubscribeVisibility?.()
    unsubscribeCrossTab?.()
    unsubscribeOnline = null
    unsubscribeVisibility = null
    unsubscribeCrossTab = null
    stopRemoteSubscription()
    stopPeriodicPull()
  }

  const validateStoredConfig = async () => {
    if (!config) return
    const activeConfig = config
    const activeConfigVersion = configVersion
    const validation = await remote.validate(activeConfig.projectId, activeConfig.anonKey)
    if (!started || activeConfigVersion !== configVersion) return
    if (!validation.ok) {
      terminalError = validation.reason !== 'network'
      updateSnapshot({ syncStatus: 'error', syncError: validationMessage(validation) })
      if (!terminalError) fail(new Error(validationMessage(validation)), 'pull')
      return
    }
    terminalError = false
    startRemoteSubscription()
    startPeriodicPull()
    await enqueue({ kind: 'pull', forcePull: true, skipFirstImport: false })
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
      connectRuntime()
      if (config) {
        updateSnapshot({ isConfigured: true, syncStatus: 'connecting' })
        runtime.setTimeout(() => void validateStoredConfig(), 0)
      }
    },
    stop: () => {
      started = false
      configVersion += 1
      desiredIntent = null
      clearTimer(pushTimer)
      clearTimer(retryTimer)
      pushTimer = null
      retryTimer = null
      disconnectRuntime()
    },
    updateLocalData: (data) => {
      currentData = data
      if (!dataInitialized) {
        dataInitialized = true
        return
      }
      if (ignoreNextDataUpdate) {
        ignoreNextDataUpdate = false
        return
      }
      localChangeVersion += 1
      updateSnapshot({ hasPendingLocalChanges: true })
      if (!config || terminalError) return
      if (snapshot.syncStatus === 'connected') {
        schedulePush()
      } else if (snapshot.syncStatus === 'syncing') {
        void enqueue({ kind: 'push', forcePull: false, skipFirstImport: false })
      }
    },
    configure: async (projectUrl, anonKey) => {
      updateSnapshot({ syncStatus: 'connecting', syncError: null })
      const validation = await remote.validate(projectUrl, anonKey)
      if (!validation.ok) {
        const error = validationMessage(validation)
        updateSnapshot({ isConfigured: false, syncStatus: 'disconnected', syncError: error })
        return { ok: false, error }
      }

      configVersion += 1
      desiredIntent = null
      stopRemoteSubscription()
      resetRetries()
      config = { projectId: projectUrl, anonKey }
      metadata.saveConfig(config)
      remote.reset()
      lastSeenTime = null
      terminalError = false
      updateSnapshot({ isConfigured: true, syncStatus: 'syncing', syncError: null })
      if (started) {
        startRemoteSubscription()
        startPeriodicPull()
      }
      return enqueue({
        kind: 'sync',
        forcePull: true,
        skipFirstImport: !shouldImportInitialRemoteData(currentData),
      })
    },
    syncNow: () =>
      enqueue({
        kind: 'sync',
        forcePull: true,
        skipFirstImport: !shouldImportInitialRemoteData(currentData),
      }),
    disconnect: () => {
      configVersion += 1
      config = null
      desiredIntent = null
      terminalError = false
      lastSeenTime = null
      clearTimer(pushTimer)
      clearTimer(retryTimer)
      pushTimer = null
      retryTimer = null
      resetRetries()
      stopRemoteSubscription()
      stopPeriodicPull()
      metadata.clearConfig()
      remote.reset()
      updateSnapshot({
        isConfigured: false,
        syncStatus: 'disconnected',
        lastSyncTime: null,
        syncError: null,
        hasPendingLocalChanges: false,
      })
    },
    clearError: () => updateSnapshot({ syncError: null }),
  }
}

function mergeIntents(current: SyncIntent | null, incoming: SyncIntent): SyncIntent {
  if (!current) return incoming
  const kind = current.kind === incoming.kind ? current.kind : 'sync'
  return {
    kind,
    forcePull: current.forcePull || incoming.forcePull,
    skipFirstImport: current.skipFirstImport && incoming.skipFirstImport,
  }
}

function shouldImportInitialRemoteData(data: ChecklistData): boolean {
  const defaults = [DEFAULT_CHECKLIST_DATA, createDefaultChecklistData('en-US')]
  return defaults.some(
    (defaultData) =>
      JSON.stringify(data.daily) === JSON.stringify(defaultData.daily) &&
      JSON.stringify(data.weekly) === JSON.stringify(defaultData.weekly) &&
      JSON.stringify(data.monthly) === JSON.stringify(defaultData.monthly),
  )
}

function validationMessage(validation: Exclude<ValidateResult, { ok: true }>): string {
  const messages: Record<Exclude<ValidateResult, { ok: true }>['reason'], string> = {
    network: i18n.t('sync.setupNetwork'),
    auth: i18n.t('sync.invalidKey'),
    table_missing: i18n.t('sync.tableMissing'),
    table_schema: i18n.t('sync.tableSchema'),
    table_permission: i18n.t('sync.permission'),
    unknown: i18n.t('sync.setupUnknown'),
  }
  return messages[validation.reason] ?? i18n.t('sync.setupUnknown')
}

function createSupabaseRemoteAdapter(): CloudSynchronizationRemoteAdapter {
  return {
    validate: validateConfig,
    pull: pullData,
    push: pushData,
    subscribe: subscribeToChanges,
    reset: resetClient,
    classifyError: classifySyncError,
    isRetryableError: (error) => {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error)
      return ![
        'invalid api key',
        'permission denied',
        'does not exist',
        'invalid cloud data',
        'invalid_data',
      ].some((marker) => message.includes(marker))
    },
  }
}

function createBrowserMetadataAdapter(): CloudSynchronizationMetadataAdapter {
  return {
    loadConfig: loadSupabaseConfig,
    saveConfig: saveSupabaseConfig,
    clearConfig: clearSyncConfig,
    loadLastSyncTime,
    saveLastSyncTime,
    loadLastSeenTime,
    saveLastSeenTime,
  }
}

function createBrowserCloudSynchronizationRuntime(): CloudSynchronizationRuntime {
  const instanceId = Math.random().toString(36).slice(2)
  return {
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
    setInterval: (callback, delay) => setInterval(callback, delay),
    clearInterval: (timer) => clearInterval(timer),
    isDocumentHidden: () => typeof document !== 'undefined' && document.hidden,
    subscribeOnline: (listener) => {
      if (typeof window === 'undefined') return () => undefined
      window.addEventListener('online', listener)
      return () => window.removeEventListener('online', listener)
    },
    subscribeVisibility: (listener) => {
      if (typeof document === 'undefined') return () => undefined
      document.addEventListener('visibilitychange', listener)
      return () => document.removeEventListener('visibilitychange', listener)
    },
    subscribeCrossTab: (listener) => {
      if (typeof window === 'undefined') return () => undefined
      const channel =
        typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CROSS_TAB_CHANNEL) : null
      if (channel) {
        channel.onmessage = (event) => {
          if (event.data?.type === 'sync-updated' && event.data?.source !== instanceId) listener()
        }
      }
      const handleStorage = (event: StorageEvent) => {
        if (event.key !== CROSS_TAB_SYNC_KEY || !event.newValue) return
        try {
          const payload = JSON.parse(event.newValue) as { source?: string }
          if (payload.source !== instanceId) listener()
        } catch {
          listener()
        }
      }
      window.addEventListener('storage', handleStorage)
      return () => {
        channel?.close()
        window.removeEventListener('storage', handleStorage)
      }
    },
    broadcast: (updatedAt) => {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CROSS_TAB_CHANNEL)
        channel.postMessage({ type: 'sync-updated', updatedAt, source: instanceId })
        channel.close()
        return
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CROSS_TAB_SYNC_KEY, JSON.stringify({ updatedAt, source: instanceId }))
      }
    },
    now: () => new Date(),
  }
}
