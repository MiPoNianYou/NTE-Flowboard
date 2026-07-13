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
  setupSupabase: (projectId: string, anonKey: string) => Promise<void>
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

  const isPullingRef = useRef(false)
  const hasLocalChangesRef = useRef(false)
  const isInitialMountRef = useRef(true)
  const isApplyingRemoteDataRef = useRef(false)
  const shouldSkipNextPushRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pullSyncRef = useRef<PullSyncFn | null>(null)
  const pushSyncRef = useRef<PushSyncFn | null>(null)
  const dataRef = useRef(data)
  const configRef = useRef<SupabaseConfig | null>(null)
  const onDataImportRef = useRef(onDataImport)
  const lastExternalDataVersionRef = useRef(externalDataVersion)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    onDataImportRef.current = onDataImport
  }, [onDataImport])

  useEffect(() => {
    if (externalDataVersion === lastExternalDataVersionRef.current) return
    lastExternalDataVersionRef.current = externalDataVersion
    hasLocalChangesRef.current = false
    isApplyingRemoteDataRef.current = true
  }, [externalDataVersion])

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
      if (
        !config ||
        !syncPolicy.shouldPull({
          isPulling: isPullingRef.current,
          hasLocalChanges: hasLocalChangesRef.current,
          shouldForce,
        })
      )
        return false

      isPullingRef.current = true
      try {
        const result = await pullData(config)
        if (!result) {
          resetAttempts()
          setSyncStatus('connected')
          setSyncError(null)
          return false
        }

        let isImported = false
        const lastSeen = loadLastSeenTime()
        const shouldImportResult = syncPolicy.shouldImport({
          remoteUpdatedAt: result.updatedAt,
          lastSeenTime: lastSeen,
          skipFirstImport: shouldSkipFirstImport,
        })
        if (shouldImportResult) {
          try {
            const remoteData = result.data
            if (remoteData.daily && remoteData.weekly && remoteData.monthly) {
              if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
              pushTimerRef.current = null
              hasLocalChangesRef.current = false
              isApplyingRemoteDataRef.current = true
              onDataImportRef.current({ ...remoteData })
              isImported = true
            }
          } catch {
            setSyncError('远程数据格式异常')
          }
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
        setSyncStatus('error')
        scheduleRetry('pull')
        return false
      } finally {
        isPullingRef.current = false
      }
    },
    [resetAttempts, scheduleRetry],
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
      if (!config || isPullingRef.current) return

      const orderedData = toOrderedData(dataToPush)

      try {
        const updatedAt = await pushData(config, orderedData)
        saveLastSeenTime(updatedAt)
        saveLastSyncTime(new Date().toISOString())
        setLastSyncTime(new Date().toISOString())
        resetAttempts()
        setSyncStatus('connected')
        setSyncError(null)
        hasLocalChangesRef.current = false
        broadcast(updatedAt)
      } catch (error) {
        setSyncError(classifySyncError(error))
        setSyncStatus('error')
        scheduleRetry('push')
      }
    },
    [broadcast, resetAttempts, scheduleRetry],
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
      if (hasLocalChangesRef.current) {
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
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }
    if (isApplyingRemoteDataRef.current) {
      isApplyingRemoteDataRef.current = false
      shouldSkipNextPushRef.current = true
      return
    }
    hasLocalChangesRef.current = true
  }, [data])

  useEffect(() => {
    if (syncStatus !== 'connected') return
    if (!configRef.current) return
    if (shouldSkipNextPushRef.current) {
      shouldSkipNextPushRef.current = false
      return
    }

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      pushSync(dataRef.current)
    }, MS.PUSH_DEBOUNCE)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [data, syncStatus, pushSync])

  const setupSupabase = useCallback(
    async (projectId: string, anonKey: string) => {
      setSyncStatus('connecting')
      setSyncError(null)
      try {
        const valid = await validateConfig(projectId, anonKey)
        if (!valid.ok) {
          const messages: Record<string, string> = {
            network: '连接失败，请检查项目 ID 或网络',
            auth: '密钥无效，请检查 Anon Key',
            table_missing: '数据表不存在，请执行建表脚本',
            table_schema: '数据表结构不对，请删除后重新执行脚本',
            table_permission: '没有访问权限，请检查 RLS 策略',
            unknown: '连接失败，请检查项目 ID 和密钥',
          }
          const base = messages[valid.reason] ?? '连接失败，请检查项目 ID 和密钥'
          setSyncError(base)
          setSyncStatus('disconnected')
          setIsConfigured(false)
          return
        }

        const config: SupabaseConfig = { projectId, anonKey }
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
