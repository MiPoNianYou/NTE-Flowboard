import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChecklistData } from '../types'
import { MS } from '../utils/constants'
import type { SupabaseConfig } from '../utils/supabase'
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  clearSyncConfig,
  loadLastSyncTime,
  saveLastSyncTime,
  resetClient,
  validateConfig,
  pushData,
  pullData,
  subscribeToChanges,
  SyncError,
} from '../utils/supabase'

export type SyncStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'error'
  | 'locked'

interface UseSupabaseSyncOptions {
  data: ChecklistData
  onDataImport: (data: ChecklistData) => void
}

interface UseSupabaseSyncReturn {
  isConfigured: boolean
  isLocked: boolean
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  setupSupabase: (projectId: string, anonKey: string, syncKey: string) => Promise<void>
  unlock: (syncKey: string) => Promise<boolean>
  triggerSync: () => Promise<void>
  disconnect: () => void
}

export function useSupabaseSync({
  data,
  onDataImport,
}: UseSupabaseSyncOptions): UseSupabaseSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    const raw = localStorage.getItem('nte-supabase-config')
    if (!raw) return 'disconnected'
    try {
      const parsed = JSON.parse(raw)
      // Encrypted format has s, i, d fields; legacy has pid, key
      if (parsed && typeof parsed === 'object' && ('s' in parsed || 'pid' in parsed)) {
        return 'locked'
      }
    } catch {
      // Corrupted config — treat as disconnected
    }
    return 'disconnected'
  })
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => loadLastSyncTime())
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(() => {
    const raw = localStorage.getItem('nte-supabase-config')
    return !!raw
  })
  const [isLocked, setIsLocked] = useState(() => syncStatus === 'locked')

  const isPullingRef = useRef(false)
  const skipNextPushRef = useRef(false)
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

  // --- Pull sync ---
  const pullSync = useCallback(async () => {
    const config = configRef.current
    if (!config) return

    isPullingRef.current = true
    skipNextPushRef.current = true
    try {
      const result = await pullData(config)
      if (!result) {
        setSyncStatus('connected')
        setSyncError(null)
        return
      }

      const lastSync = loadLastSyncTime()
      if (!lastSync || new Date(result.updatedAt) > new Date(lastSync)) {
        try {
          const remoteData = result.data as ChecklistData
          if (remoteData.daily && remoteData.weekly) {
            onDataImportRef.current(remoteData)
          }
        } catch {
          setSyncError('远程数据格式异常')
        }
      }

      saveLastSyncTime(result.updatedAt)
      setLastSyncTime(result.updatedAt)
      setSyncStatus('connected')
      setSyncError(null)
    } catch (e) {
      if (e instanceof SyncError) {
        setSyncError(e.message)
      } else {
        setSyncError('同步失败')
      }
      setSyncStatus('error')
    } finally {
      isPullingRef.current = false
    }
  }, [])

  // Auto-recover from error after 5s — verify connectivity before claiming connected
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (syncStatus === 'error') {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => {
        if (configRef.current) {
          // Attempt a pull to verify actual connectivity
          pullSync().catch(() => {
            // pullSync already sets error status on failure, so nothing more needed
          })
        } else {
          setSyncStatus('disconnected')
        }
      }, MS.ERROR_RECOVERY)
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [syncStatus, pullSync])

  // --- Push sync ---
  const pushSync = useCallback(async (dataToPush: ChecklistData) => {
    const config = configRef.current
    if (!config || isPullingRef.current) return

    try {
      const updatedAt = await pushData(config, dataToPush)
      saveLastSyncTime(updatedAt)
      setLastSyncTime(updatedAt)
      setSyncStatus('connected')
      setSyncError(null)
    } catch (e) {
      if (e instanceof SyncError) {
        setSyncError(e.message)
      } else {
        setSyncError('同步失败')
      }
      setSyncStatus('error')
    }
  }, [])

  // --- Startup pull ---
  useEffect(() => {
    if (!configRef.current) return
    const timer = setTimeout(() => {
      pullSync()
    }, 0)
    return () => clearTimeout(timer)
  }, [pullSync])

  // --- Realtime subscription (instant cross-device sync) ---
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

  // --- Periodic pull (every 5min) + visibility restore pull ---
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

  // --- Auto-push on data change (3s debounce, only when connected) ---
  useEffect(() => {
    if (syncStatus !== 'connected') return

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false
      return
    }

    if (!configRef.current) return

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      pushSync(dataRef.current)
    }, MS.PUSH_DEBOUNCE)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [data, syncStatus, pushSync])

  // --- Unlock: decrypt config with sync key and connect ---
  const unlock = useCallback(
    async (syncKey: string): Promise<boolean> => {
      setSyncError(null)
      try {
        const config = await loadSupabaseConfig(syncKey)
        if (!config || !config.projectId || !config.anonKey) {
          setSyncError('密钥错误或配置无效')
          return false
        }

        configRef.current = config
        resetClient()
        setIsLocked(false)
        setIsConfigured(true)
        setSyncStatus('connecting')

        // Validate and connect
        const valid = await validateConfig(config.projectId, config.anonKey)
        if (!valid) {
          setSyncError('连接失败，请检查配置')
          setSyncStatus('disconnected')
          setIsConfigured(false)
          configRef.current = null
          return false
        }

        setSyncStatus('syncing')
        await pullSync()
        return true
      } catch {
        setSyncError('解密失败，请检查密钥')
        return false
      }
    },
    [pullSync],
  )

  // --- Setup: validate, encrypt and save ---
  const setupSupabase = useCallback(
    async (projectId: string, anonKey: string, syncKey: string) => {
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

        const config: SupabaseConfig = { projectId, anonKey, syncKey }
        await saveSupabaseConfig(config, syncKey)
        configRef.current = config
        resetClient()
        setIsConfigured(true)
        setIsLocked(false)

        setSyncStatus('syncing')
        await pullSync()
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
    [pullSync],
  )

  // --- Manual sync trigger ---
  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncError(null)

    await pullSync()
    await pushSync(dataRef.current)
  }, [pullSync, pushSync])

  // --- Disconnect ---
  const disconnect = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    clearSyncConfig()
    resetClient()
    configRef.current = null
    setSyncStatus('disconnected')
    setIsConfigured(false)
    setIsLocked(false)
    setLastSyncTime(null)
    setSyncError(null)
  }, [])

  return {
    isConfigured,
    isLocked,
    syncStatus,
    lastSyncTime,
    syncError,
    setupSupabase,
    unlock,
    triggerSync,
    disconnect,
  }
}
