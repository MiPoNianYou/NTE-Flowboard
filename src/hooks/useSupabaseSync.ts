import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChecklistData, SyncStatus } from '../types'
import type { ChecklistController } from '../utils/checklistController'
import { MS } from '../utils/constants'
import type { SupabaseConfig } from '../utils/supabase'
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  clearSyncConfig,
  loadLastSyncTime,
  saveLastSyncTime,
  loadLastSeenTime,
  saveLastSeenTime,
  resetClient,
  validateConfig,
  pushData,
  pullData,
  subscribeToChanges,
  classifySyncError,
} from '../utils/supabase'
import { toOrderedData } from '../utils/serialization'
import * as syncPolicy from '../utils/syncPolicy'
import { useVisibilityInterval } from './useVisibilityInterval'
import { useRetryScheduler } from './useRetryScheduler'
import { useCrossTabSync } from './useCrossTabSync'
import { useTranslation } from 'react-i18next'
import { createSyncSession, type SyncSession } from '../utils/syncSession'

interface UseSupabaseSyncOptions {
  data: ChecklistData
  onDataImport: (data: ChecklistData) => void
  syncPort?: ChecklistController['syncPort']
}

interface UseSupabaseSyncReturn {
  isConfigured: boolean
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  setupSupabase: (projectUrl: string, anonKey: string) => Promise<void>
  triggerSync: () => Promise<void>
  teardownSupabase: () => void
  clearSyncError: () => void
}

type PullSyncFn = (shouldForce?: boolean, shouldSkipFirstImport?: boolean) => Promise<boolean>
type PushSyncFn = (dataToPush: ChecklistData) => Promise<void>

const RETRY_DELAYS = [MS.ERROR_RECOVERY, MS.ERROR_RECOVERY * 3, MS.ERROR_RECOVERY * 9] as const

export function useSupabaseSync({
  data,
  onDataImport,
  syncPort,
}: UseSupabaseSyncOptions): UseSupabaseSyncReturn {
  const { t } = useTranslation()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    const config = loadSupabaseConfig()
    return config ? 'connecting' : 'disconnected'
  })
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => loadLastSyncTime())
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(() => {
    return !!loadSupabaseConfig()
  })

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pullSyncRef = useRef<PullSyncFn | null>(null)
  const pushSyncRef = useRef<PushSyncFn | null>(null)
  const sessionRef = useRef<SyncSession | null>(null)
  const dataRef = useRef(data)
  const configRef = useRef<SupabaseConfig | null>(null)
  const onDataImportRef = useRef(onDataImport)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    onDataImportRef.current = onDataImport
  }, [onDataImport])

  const { scheduleRetry, resetAttempts } = useRetryScheduler({
    delays: RETRY_DELAYS,
    onRetry: useCallback((kind) => {
      setSyncStatus('syncing')
      if (kind === 'push') void pushSyncRef.current?.(dataRef.current)
      else void pullSyncRef.current?.(true)
    }, []),
  })

  const { broadcast } = useCrossTabSync({
    onRemoteUpdate: useCallback(() => {
      if (!configRef.current) return
      void pullSyncRef.current?.(true)
    }, []),
  })

  if (!sessionRef.current) {
    sessionRef.current = createSyncSession({
      config: null,
      initialLastSeenTime: loadLastSeenTime(),
      syncPort,
      pullRemote: pullData,
      pushRemote: (config, remoteData) => pushData(config, toOrderedData(remoteData)),
      onDataImport: (remoteData) => onDataImportRef.current(remoteData),
      onRemoteApplied: () => {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      },
      onLastSeen: (updatedAt) => {
        const syncedAt = new Date().toISOString()
        saveLastSeenTime(updatedAt)
        saveLastSyncTime(syncedAt)
        setLastSyncTime(syncedAt)
      },
      onStatus: setSyncStatus,
      onError: (error) => setSyncError(classifySyncError(error)),
      onClearError: () => setSyncError(null),
      onRetry: scheduleRetry,
      resetRetries: resetAttempts,
      broadcast,
    })
  }
  sessionRef.current.setSyncPort(syncPort)

  const pullSync = useCallback(
    async (shouldForce = false, shouldSkipFirstImport = false): Promise<boolean> => {
      const result = await sessionRef.current?.pull(shouldForce, shouldSkipFirstImport)
      return result?.imported ?? false
    },
    [],
  )
  pullSyncRef.current = pullSync

  const pushSync = useCallback(async (dataToPush: ChecklistData) => {
    await sessionRef.current?.push(dataToPush)
  }, [])
  pushSyncRef.current = pushSync

  useEffect(() => {
    const config = loadSupabaseConfig()
    if (!config) return

    configRef.current = config
    sessionRef.current?.setConfig(config)

    const timer = setTimeout(() => {
      validateConfig(config.projectId, config.anonKey).then((valid) => {
        if (valid.ok) {
          setSyncStatus('syncing')
          void pullSyncRef.current?.(true)
        } else {
          setSyncStatus('disconnected')
          setIsConfigured(false)
          configRef.current = null
          sessionRef.current?.setConfig(null)
        }
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const config = configRef.current
    if (!config) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeToChanges(config, () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        pullSync(true)
      }, MS.REALTIME_DEBOUNCE)
    })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (unsubscribe) unsubscribe()
    }
  }, [isConfigured, pullSync])

  useVisibilityInterval(
    () => {
      if (configRef.current) pullSync()
    },
    MS.PERIODIC_PULL,
    isConfigured,
  )

  useEffect(() => {
    const handleOnline = () => {
      if (!configRef.current) return
      if (sessionRef.current?.getState().hasLocalChanges) {
        void pushSync(dataRef.current)
        return
      }
      void pullSync(true)
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [pullSync, pushSync])

  useEffect(() => {
    if (!sessionRef.current?.markLocalChange() || !configRef.current) return

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      void pushSync(dataRef.current)
    }, MS.PUSH_DEBOUNCE)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [data, pushSync])

  const setupSupabase = useCallback(
    async (projectUrl: string, anonKey: string) => {
      setSyncStatus('connecting')
      setSyncError(null)
      try {
        const valid = await validateConfig(projectUrl, anonKey)
        if (!valid.ok) {
          const messages: Record<string, string> = {
            network: t('sync.setupNetwork'),
            auth: t('sync.invalidKey'),
            table_missing: t('sync.tableMissing'),
            table_schema: t('sync.tableSchema'),
            table_permission: t('sync.permission'),
            unknown: t('sync.setupUnknown'),
          }
          const base = messages[valid.reason] ?? t('sync.setupUnknown')
          setSyncError(base)
          setSyncStatus('disconnected')
          setIsConfigured(false)
          configRef.current = null
          sessionRef.current?.setConfig(null)
          return
        }

        const config: SupabaseConfig = { projectId: projectUrl, anonKey }
        saveSupabaseConfig(config)
        configRef.current = config
        sessionRef.current?.setConfig(config)
        resetClient()
        setIsConfigured(true)

        setSyncStatus('syncing')
        const isImported = await pullSync(
          true,
          !syncPolicy.shouldImportInitialRemoteData(dataRef.current),
        )
        if (!isImported) {
          await pushSync(dataRef.current)
        }
      } catch (error) {
        setSyncError(classifySyncError(error))
        setSyncStatus('disconnected')
        setIsConfigured(false)
        configRef.current = null
        sessionRef.current?.setConfig(null)
      }
    },
    [pullSync, pushSync, t],
  )

  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncError(null)

    const isImported = await pullSync(
      true,
      !syncPolicy.shouldImportInitialRemoteData(dataRef.current),
    )
    if (!isImported) {
      await pushSync(dataRef.current)
    }
  }, [pullSync, pushSync])

  const teardownSupabase = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    clearSyncConfig()
    resetClient()
    configRef.current = null
    sessionRef.current?.setConfig(null)
    setSyncStatus('disconnected')
    setIsConfigured(false)
    setLastSyncTime(null)
    setSyncError(null)
  }, [])

  return {
    isConfigured,
    syncStatus,
    lastSyncTime,
    syncError,
    setupSupabase,
    triggerSync,
    teardownSupabase,
    clearSyncError: useCallback(() => setSyncError(null), []),
  }
}
