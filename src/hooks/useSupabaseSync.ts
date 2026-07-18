import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChecklistData, SyncStatus } from '../types'
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
import {
  coordinateSync,
  type SyncEvent,
  type SyncCoordinationState,
} from '../utils/syncCoordinator'
import { useVisibilityInterval } from './useVisibilityInterval'
import { useRetryScheduler } from './useRetryScheduler'
import { useCrossTabSync } from './useCrossTabSync'

interface UseSupabaseSyncOptions {
  data: ChecklistData
  onDataImport: (data: ChecklistData) => void
  externalDataVersion?: number
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
  externalDataVersion = 0,
}: UseSupabaseSyncOptions): UseSupabaseSyncReturn {
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
  const dataRef = useRef(data)
  const configRef = useRef<SupabaseConfig | null>(null)
  const onDataImportRef = useRef(onDataImport)
  const lastExternalDataVersionRef = useRef(externalDataVersion)
  const coordinationRef = useRef<SyncCoordinationState>({
    syncStatus: loadSupabaseConfig() ? 'connecting' : 'disconnected',
    isPulling: false,
    hasLocalChanges: false,
    shouldSkipNextPush: false,
    lastSeenTime: loadLastSeenTime(),
    isDataInitialized: false,
  })

  const coordinate = useCallback((event: SyncEvent) => {
    const decision = coordinateSync(coordinationRef.current, event)
    coordinationRef.current = decision.state
    setSyncStatus(decision.state.syncStatus)
    return decision
  }, [])
  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    onDataImportRef.current = onDataImport
  }, [onDataImport])

  useEffect(() => {
    if (externalDataVersion === lastExternalDataVersionRef.current) return
    lastExternalDataVersionRef.current = externalDataVersion
    coordinate({ kind: 'external-data-applied' })
  }, [coordinate, externalDataVersion])

  const { scheduleRetry, resetAttempts } = useRetryScheduler({
    delays: RETRY_DELAYS,
    onRetry: useCallback((kind) => {
      setSyncStatus('syncing')
      if (kind === 'push') void pushSyncRef.current?.(dataRef.current)
      else void pullSyncRef.current?.(true)
    }, []),
  })

  const pullSync = useCallback(
    async (shouldForce = false, shouldSkipFirstImport = false): Promise<boolean> => {
      const config = configRef.current
      const coordination = coordinate({ kind: 'request-pull', force: shouldForce })
      if (!config || coordination.command !== 'pull') return false

      try {
        const result = await pullData(config)
        if (!result) {
          const decision = coordinate({ kind: 'pull-empty' })
          if (decision.shouldResetRetries) resetAttempts()
          setSyncStatus('connected')
          setSyncError(null)
          return false
        }

        coordinationRef.current = {
          ...coordinationRef.current,
          lastSeenTime: loadLastSeenTime(),
        }
        const decision = coordinate({
          kind: 'pull-succeeded',
          data: result.data,
          updatedAt: result.updatedAt,
          skipFirstImport: shouldSkipFirstImport,
          pushAfterPull: false,
        })
        const isImported = decision.command === 'import-remote'
        if (isImported) {
          if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
          pushTimerRef.current = null
          onDataImportRef.current({ ...result.data })
        }

        saveLastSeenTime(result.updatedAt)
        saveLastSyncTime(new Date().toISOString())
        setLastSyncTime(new Date().toISOString())
        resetAttempts()
        setSyncStatus('connected')
        setSyncError(null)
        return isImported
      } catch (error) {
        setSyncError(classifySyncError(error))
        const decision = coordinate({ kind: 'pull-failed' })
        if (decision.shouldRetry) scheduleRetry(decision.shouldRetry)
        return false
      } finally {
        // Pull completion is represented by the coordination state.
      }
    },
    [coordinate, resetAttempts, scheduleRetry],
  )
  pullSyncRef.current = pullSync

  const { broadcast } = useCrossTabSync({
    onRemoteUpdate: useCallback(() => {
      if (!configRef.current) return
      void pullSyncRef.current?.(true)
    }, []),
  })

  const pushSync = useCallback(
    async (dataToPush: ChecklistData) => {
      const config = configRef.current
      if (!config) return
      const coordination = coordinate({ kind: 'request-push' })
      if (coordination.command !== 'push') return

      const orderedData = toOrderedData(dataToPush)

      try {
        const updatedAt = await pushData(config, orderedData)
        saveLastSeenTime(updatedAt)
        saveLastSyncTime(new Date().toISOString())
        setLastSyncTime(new Date().toISOString())
        resetAttempts()
        setSyncStatus('connected')
        setSyncError(null)
        coordinate({ kind: 'push-succeeded', updatedAt })
        broadcast(updatedAt)
      } catch (error) {
        setSyncError(classifySyncError(error))
        const decision = coordinate({ kind: 'push-failed' })
        if (decision.shouldRetry) scheduleRetry(decision.shouldRetry)
      }
    },
    [broadcast, coordinate, resetAttempts, scheduleRetry],
  )
  pushSyncRef.current = pushSync

  useEffect(() => {
    const config = loadSupabaseConfig()
    if (!config) return

    configRef.current = config

    const timer = setTimeout(() => {
      validateConfig(config.projectId, config.anonKey).then((valid) => {
        if (valid.ok) {
          setSyncStatus('syncing')
          void pullSyncRef.current?.(true)
        } else {
          setSyncStatus('disconnected')
          setIsConfigured(false)
          configRef.current = null
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
      if (coordinationRef.current.hasLocalChanges) {
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
    const coordination = coordinate({ kind: 'local-data-changed' })
    if (coordination.command !== 'schedule-push' || !configRef.current) return

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      void pushSync(dataRef.current)
    }, MS.PUSH_DEBOUNCE)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [coordinate, data, pushSync])

  const setupSupabase = useCallback(
    async (projectUrl: string, anonKey: string) => {
      setSyncStatus('connecting')
      setSyncError(null)
      try {
        const valid = await validateConfig(projectUrl, anonKey)
        if (!valid.ok) {
          const messages: Record<string, string> = {
            network: '连接失败，请检查 Project URL 或网络',
            auth: '密钥无效，请检查 Publishable Key',
            table_missing: '数据表不存在，请执行建表脚本',
            table_schema: '数据表结构不对，请删除后重新执行脚本',
            table_permission: '没有访问权限，请检查 RLS 策略',
            unknown: '连接失败，请检查 Project URL 和密钥',
          }
          const base = messages[valid.reason] ?? '连接失败，请检查 Project URL 和密钥'
          setSyncError(base)
          setSyncStatus('disconnected')
          setIsConfigured(false)
          return
        }

        const config: SupabaseConfig = { projectId: projectUrl, anonKey }
        saveSupabaseConfig(config)
        configRef.current = config
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
      }
    },
    [pullSync, pushSync],
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
