import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChecklistData, BehaviorSettings, SyncStatus } from '../types'
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
  SyncError,
} from '../utils/supabase'
import { toOrderedData } from '../utils/storage'

interface UseSupabaseSyncOptions {
  data: ChecklistData
  onDataImport: (data: ChecklistData) => void
  onSettingsImport?: (settings: BehaviorSettings) => void
  includeSettings?: boolean
  settings?: BehaviorSettings
}

interface UseSupabaseSyncReturn {
  isConfigured: boolean
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  setupSupabase: (projectId: string, anonKey: string) => Promise<void>
  triggerSync: () => Promise<void>
  disconnect: () => void
}

export function useSupabaseSync({
  data,
  onDataImport,
  onSettingsImport,
  includeSettings,
  settings,
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
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef(data)
  const configRef = useRef<SupabaseConfig | null>(null)
  const onDataImportRef = useRef(onDataImport)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    onDataImportRef.current = onDataImport
  }, [onDataImport])

  const onSettingsImportRef = useRef(onSettingsImport)
  useEffect(() => {
    onSettingsImportRef.current = onSettingsImport
  }, [onSettingsImport])

  // --- 拉取同步 ---
  const pullSync = useCallback(async (force = false): Promise<boolean> => {
    const config = configRef.current
    if (!config || isPullingRef.current) return false
    if (!force && hasLocalChangesRef.current) return false

    isPullingRef.current = true
    try {
      const result = await pullData(config)
      if (!result) {
        setSyncStatus('connected')
        setSyncError(null)
        return false
      }

      const lastSeen = loadLastSeenTime()
      if (!lastSeen || new Date(result.updatedAt) > new Date(lastSeen)) {
        try {
          const remoteData = result.data
          if (remoteData.daily && remoteData.weekly) {
            onDataImportRef.current({
              ...remoteData,
              custom: remoteData.custom ?? [],
            })
            if (remoteData.settings && onSettingsImportRef.current) {
              onSettingsImportRef.current(remoteData.settings)
            }
          }
        } catch {
          setSyncError('远程数据格式异常')
        }
      }

      saveLastSeenTime(result.updatedAt)
      saveLastSyncTime(new Date().toISOString())
      setLastSyncTime(new Date().toISOString())
      setSyncStatus('connected')
      setSyncError(null)
      return true
    } catch (e) {
      if (e instanceof SyncError) {
        setSyncError(e.message)
      } else {
        setSyncError('同步失败')
      }
      setSyncStatus('error')
      return false
    } finally {
      isPullingRef.current = false
    }
  }, [])

  // 错误后 5 秒自动恢复
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (syncStatus === 'error') {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => {
        if (configRef.current) {
          pullSync().catch(() => {})
        } else {
          setSyncStatus('disconnected')
        }
      }, MS.ERROR_RECOVERY)
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [syncStatus, pullSync])

  // --- 推送同步 ---
  const pushSync = useCallback(async (dataToPush: ChecklistData) => {
    const config = configRef.current
    if (!config || isPullingRef.current) return

    const orderedData = toOrderedData(
      dataToPush,
      includeSettings ? settings : undefined,
    )

    try {
      const updatedAt = await pushData(config, orderedData)
      saveLastSeenTime(updatedAt)
      saveLastSyncTime(new Date().toISOString())
      setLastSyncTime(new Date().toISOString())
      setSyncStatus('connected')
      setSyncError(null)
      hasLocalChangesRef.current = false
    } catch (e) {
      if (e instanceof SyncError) {
        setSyncError(e.message)
      } else {
        setSyncError('同步失败')
      }
      setSyncStatus('error')
    }
  }, [includeSettings, settings])

  // --- 启动：加载配置并连接 ---
  useEffect(() => {
    const config = loadSupabaseConfig()
    if (!config) return

    configRef.current = config
    resetClient()

    const timer = setTimeout(() => {
      validateConfig(config.projectId, config.anonKey).then((valid) => {
        if (valid) {
          setSyncStatus('syncing')
          pullSync(true)
        } else {
          setSyncStatus('disconnected')
          setIsConfigured(false)
          configRef.current = null
        }
      })
    }, 0)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- 实时订阅 ---
  useEffect(() => {
    const config = configRef.current
    if (!config) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeToChanges(config, () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        pullSync()
      }, MS.REALTIME_DEBOUNCE)
    })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (unsubscribe) unsubscribe()
    }
  }, [isConfigured, pullSync])

  // --- 定时拉取 + 可见性恢复 ---
  useEffect(() => {
    if (!configRef.current) return

    function handleVisibility() {
      if (!document.hidden && configRef.current) {
        pullSync()
      }
    }

    const interval = setInterval(
      () => {
        if (!document.hidden && configRef.current) {
          pullSync()
        }
      },
      MS.PERIODIC_PULL,
    )

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isConfigured, pullSync])

  // --- 跟踪本地变更 ---
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }
    hasLocalChangesRef.current = true
  }, [data])

  // --- 数据变更时自动推送（3 秒防抖） ---
  useEffect(() => {
    if (syncStatus !== 'connected') return
    if (!configRef.current) return

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      pushSync(dataRef.current)
    }, MS.PUSH_DEBOUNCE)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [data, syncStatus, pushSync])

  // --- 配置：验证并保存 ---
  const setupSupabase = useCallback(
    async (projectId: string, anonKey: string) => {
      setSyncStatus('connecting')
      setSyncError(null)
      try {
        const valid = await validateConfig(projectId, anonKey)
        if (!valid) {
          setSyncError('连接失败，请检查项目 ID 和 Key')
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
        await pullSync(true)
        await pushSync(dataRef.current)
      } catch (e) {
        if (e instanceof SyncError) {
          setSyncError(e.message)
        } else {
          setSyncError('同步失败')
        }
        setSyncStatus('disconnected')
        setIsConfigured(false)
      }
    },
    [pullSync, pushSync],
  )

  // --- 手动触发同步 ---
  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncError(null)

    await pullSync(true)
    await pushSync(dataRef.current)
  }, [pullSync, pushSync])

  // --- 断开连接 ---
  const disconnect = useCallback(() => {
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
    disconnect,
  }
}
