import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ChecklistData } from '../types'
import { isChecklistData, mergeChecklistData } from './storage'

const SYNC_TABLE = 'sync_data'

// --- Config ---

export interface SupabaseConfig {
  projectId: string
  anonKey: string
}

const CONFIG_KEY = 'nte-supabase-config'
const LAST_SYNC_KEY = 'nte-supabase-last-sync'
const LAST_SEEN_KEY = 'nte-supabase-last-seen'

function buildSupabaseUrl(projectId: string): string {
  return `https://${projectId}.supabase.co`
}

/**
 * 从 localStorage 加载 Supabase 配置。
 * 支持新格式 { projectId, anonKey } 和旧格式 { pid, key }。
 */
export function loadSupabaseConfig(): SupabaseConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>
      // 新格式
      if (typeof obj.projectId === 'string' && typeof obj.anonKey === 'string') {
        return { projectId: obj.projectId, anonKey: obj.anonKey }
      }
      // 旧格式
      if ('pid' in obj && 'key' in obj) {
        return {
          projectId: (obj.pid as string) || '',
          anonKey: (obj.key as string) || '',
        }
      }
    }
  } catch {
    return null
  }
  return null
}

/** 保存 Supabase 配置到 localStorage（明文，无加密） */
export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearSyncConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
  localStorage.removeItem(LAST_SEEN_KEY)
}

export function loadLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

export function saveLastSyncTime(isoString: string): void {
  localStorage.setItem(LAST_SYNC_KEY, isoString)
}

export function loadLastSeenTime(): string | null {
  return localStorage.getItem(LAST_SEEN_KEY)
}

export function saveLastSeenTime(isoString: string): void {
  localStorage.setItem(LAST_SEEN_KEY, isoString)
}

// --- Client ---

let client: SupabaseClient | null = null
let cachedConfig: SupabaseConfig | null = null

function getSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (
    !client ||
    cachedConfig?.projectId !== config.projectId ||
    cachedConfig?.anonKey !== config.anonKey
  ) {
    client = createClient(buildSupabaseUrl(config.projectId), config.anonKey)
    cachedConfig = config
  }
  return client
}

export function resetClient(): void {
  client = null
  cachedConfig = null
}

// --- Realtime subscription ---

export function subscribeToChanges(
  config: SupabaseConfig,
  onChange: () => void,
): (() => void) | null {
  const sb = getSupabaseClient(config)

  const channel = sb
    .channel('sync-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: SYNC_TABLE }, () => {
      onChange()
    })
    .subscribe()

  return () => {
    sb.removeChannel(channel)
  }
}

// --- API ---

export class SyncError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

/** 通过检查连通性来验证 Supabase 配置 */
export async function validateConfig(projectId: string, anonKey: string): Promise<boolean> {
  try {
    const url = buildSupabaseUrl(projectId)
    const sb = createClient(url, anonKey)
    const { error } = await sb.rpc('pull_sync').maybeSingle()
    if (error && error.code !== '42883' && error.code !== 'PGRST301') {
      return false
    }
    return true
  } catch {
    return false
  }
}

/** 通过 RPC 推送本地数据 */
export async function pushData(config: SupabaseConfig, data: Record<string, unknown>): Promise<string> {
  const sb = getSupabaseClient(config)
  const { data: result, error } = await sb.rpc('upsert_sync', {
    p_data: data,
  })

  if (error) {
    throw new SyncError(`推送失败: ${error.message}`, 'PUSH_ERROR')
  }

  if (typeof result !== 'string') {
    throw new SyncError('推送返回格式异常', 'PUSH_ERROR')
  }

  return result
}

/** 通过 RPC 拉取远程数据 */
export async function pullData(
  config: SupabaseConfig,
): Promise<{ data: ChecklistData; updatedAt: string } | null> {
  const sb = getSupabaseClient(config)
  const { data: row, error } = await sb
    .rpc('pull_sync')
    .maybeSingle<{ data: string; updated_at: string }>()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new SyncError(`拉取失败: ${error.message}`, 'PULL_ERROR')
  }

  if (!row) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(row.data)
  } catch {
    throw new SyncError('云端数据格式无效', 'INVALID_DATA')
  }

  if (!isChecklistData(parsed)) {
    throw new SyncError('云端数据格式无效', 'INVALID_DATA')
  }

  if (typeof row.updated_at !== 'string') {
    throw new SyncError('云端数据缺少更新时间', 'INVALID_DATA')
  }

  return {
    data: mergeChecklistData(parsed),
    updatedAt: row.updated_at,
  }
}
