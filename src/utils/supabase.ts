import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ChecklistData } from '../types'
import { isChecklistData } from './validation'
import { mergeChecklistData } from './dataMigration'

const SYNC_TABLE = 'sync_data'

// --- 配置 ---

export interface SupabaseConfig {
  projectId: string
  anonKey: string
}

const CONFIG_KEY = 'flowboard-cloud-config'
const LAST_SYNC_KEY = 'flowboard-cloud-last-sync'
const LAST_SEEN_KEY = 'flowboard-cloud-last-seen'

function buildSupabaseUrl(projectId: string): string {
  return `https://${projectId}.supabase.co`
}

/**
 * 从 localStorage 加载 Supabase 配置。
 */
export function loadSupabaseConfig(): SupabaseConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed === 'object' && parsed !== null) {
      const parsedObject = parsed as Record<string, unknown>
      if (typeof parsedObject.projectId === 'string' && typeof parsedObject.anonKey === 'string') {
        return { projectId: parsedObject.projectId, anonKey: parsedObject.anonKey }
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

// --- 客户端 ---

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

// --- 实时订阅 ---

export function subscribeToChanges(
  config: SupabaseConfig,
  onChange: () => void,
): (() => void) | null {
  const supabaseClient = getSupabaseClient(config)

  const channel = supabaseClient
    .channel('sync_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: SYNC_TABLE }, () => {
      onChange()
    })
    .subscribe()

  return () => {
    supabaseClient.removeChannel(channel)
  }
}

// --- 接口 ---

export class SyncError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

/** 将 SyncError 映射为用户友好的中文提示 */
export function classifySyncError(error: unknown): string {
  if (!(error instanceof SyncError)) return '同步失败'

  const errorMessage = error.message.toLowerCase()

  if (errorMessage.includes('column') && errorMessage.includes('does not exist'))
    return '数据表结构不对，请删除后重新执行建表脚本'
  if (errorMessage.includes('relation') && errorMessage.includes('does not exist'))
    return '数据表不存在，请执行建表脚本'

  if (errorMessage.includes('permission denied') || error.code === '42501')
    return '没有访问权限，请检查 RLS 策略'
  if (errorMessage.includes('invalid api key') || error.code === '28P01')
    return '密钥无效，请检查 Anon Key'
  if (errorMessage.includes('failed to fetch') || !error.code) return '连接失败，请检查网络'

  if (error.code === 'INVALID_DATA') return '云端数据格式无效，请重新同步'

  return '同步失败，请检查配置后重试'
}

export type ValidateReason =
  | 'network'
  | 'auth'
  | 'table_missing'
  | 'table_schema'
  | 'table_permission'
  | 'unknown'

export type ValidateResult = { ok: true } | { ok: false; reason: ValidateReason; detail?: string }

/** 通过检查连通性来验证 Supabase 配置 */
export async function validateConfig(projectId: string, anonKey: string): Promise<ValidateResult> {
  try {
    const url = buildSupabaseUrl(projectId)
    const supabaseClient = createClient(url, anonKey)
    const { error } = await supabaseClient.rpc('pull_sync').maybeSingle()
    if (!error || error.code === '42883' || error.code === 'PGRST301') {
      return { ok: true }
    }
    if (error.message?.includes('Invalid API key') || error.code === '28P01') {
      return { ok: false, reason: 'auth', detail: error.message }
    }
    if (!error.code || error.message?.includes('Failed to fetch')) {
      return { ok: false, reason: 'network', detail: error.message }
    }
    if (error.code === '42P01') {
      return { ok: false, reason: 'table_missing', detail: error.message }
    }
    if (error.code === '42501') {
      return { ok: false, reason: 'table_permission', detail: error.message }
    }
    if (['42703', 'PGRST204', 'PGRST205'].includes(error.code)) {
      return { ok: false, reason: 'table_schema', detail: error.message }
    }
    return { ok: false, reason: 'unknown', detail: error.message }
  } catch (error) {
    return {
      ok: false,
      reason: 'network',
      detail: error instanceof Error ? error.message : undefined,
    }
  }
}

/** 通过 RPC 推送本地数据 */
export async function pushData(
  config: SupabaseConfig,
  data: Record<string, unknown>,
): Promise<string> {
  const supabaseClient = getSupabaseClient(config)
  const { data: result, error } = await supabaseClient.rpc('upsert_sync', {
    p_data: JSON.stringify(data, null, 2),
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
  const supabaseClient = getSupabaseClient(config)
  const { data: row, error } = await supabaseClient
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
