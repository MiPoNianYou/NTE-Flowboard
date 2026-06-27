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
  classifySyncError,
} from '../utils/supabase'
import { toOrderedData } from '../utils/storage'
import * as syncPolicy from '../utils/syncPolicy'
import { useVisibilityInterval } from './useVisibilityInterval'

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
  teardownSupabase: () => void
  clearSyncError: () => void
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
  // 返回 true 表示远程数据已导入本地（调用方不应再 push）
  // 返回 false 表示需要 push 或 pull 失败/跳过
  // skipFirstImport=true: lastSeen 为 null 时不导入（手动同步用，优先保留本地数据）
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
              onDataImportRef.current({ ...remoteData })
              if (remoteData.settings && onSettingsImportRef.current) {
                onSettingsImportRef.current(remoteData.settings)
              }
              isImported = true
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
        return isImported
      } catch (error) {
        setSyncError(classifySyncError(error))
        setSyncStatus('error')
        return false
      } finally {
        isPullingRef.current = false
      }
    },
    [],
  )

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
  const pushSync = useCallback(
    async (dataToPush: ChecklistData) => {
      const config = configRef.current
      if (!config || isPullingRef.current) return

      const orderedData = toOrderedData(dataToPush, includeSettings ? settings : undefined)

      try {
        const updatedAt = await pushData(config, orderedData)
        saveLastSeenTime(updatedAt)
        saveLastSyncTime(new Date().toISOString())
        setLastSyncTime(new Date().toISOString())
        setSyncStatus('connected')
        setSyncError(null)
        hasLocalChangesRef.current = false
      } catch (error) {
        setSyncError(classifySyncError(error))
        setSyncStatus('error')
      }
    },
    [includeSettings, settings],
  )

  // --- 启动：加载配置并连接 ---
  useEffect(() => {
    const config = loadSupabaseConfig()
    if (!config) return

    configRef.current = config
    resetClient()

    const timer = setTimeout(() => {
      validateConfig(config.projectId, config.anonKey).then((valid) => {
        if (valid.ok) {
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 仅在组件挂载时执行一次

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
  useVisibilityInterval(
    () => {
      if (configRef.current) pullSync()
    },
    MS.PERIODIC_PULL,
    isConfigured,
  )

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
        const isImported = await pullSync(true, true)
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

  // --- 手动触发同步 ---
  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing')
    setSyncError(null)

    const isImported = await pullSync(true, true)
    if (!isImported) {
      await pushSync(dataRef.current)
    }
  }, [pullSync, pushSync])

  // --- 断开连接 ---
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
