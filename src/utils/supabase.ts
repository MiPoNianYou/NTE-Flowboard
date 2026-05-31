import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ChecklistData } from '../types'
import { isChecklistData } from './storage'
import { encrypt, decrypt, isEncryptedPayload } from './crypto'

const SYNC_TABLE = 'sync_data'

// --- Config ---

export interface SupabaseConfig {
  projectId: string
  anonKey: string
  syncKey: string
}

const CONFIG_KEY = 'nte-supabase-config'
const LAST_SYNC_KEY = 'nte-supabase-last-sync'

function buildSupabaseUrl(projectId: string): string {
  return `https://${projectId}.supabase.co`
}

/**
 * Load Supabase config. Supports two formats:
 * - Legacy: plaintext { pid, key, syncKey } (for migration)
 * - New: encrypted EncryptedPayload
 *
 * Uses syncKey as the decryption key (dual-purpose: RLS + encryption).
 * For legacy plaintext migration, returns the raw values.
 */
export async function loadSupabaseConfig(syncKey?: string): Promise<SupabaseConfig | null> {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)

    // New encrypted format
    if (isEncryptedPayload(parsed)) {
      if (!syncKey) return null
      const json = await decrypt(parsed, syncKey)
      const data = JSON.parse(json) as Record<string, unknown>
      if (
        typeof data.projectId === 'string' &&
        typeof data.anonKey === 'string' &&
        typeof data.syncKey === 'string'
      ) {
        return { projectId: data.projectId, anonKey: data.anonKey, syncKey: data.syncKey }
      }
      return null
    }

    // Legacy plaintext format (migration path)
    if (typeof parsed === 'object' && parsed !== null && 'pid' in parsed && 'key' in parsed) {
      const obj = parsed as Record<string, unknown>
      return {
        projectId: (obj.pid as string) || '',
        anonKey: (obj.key as string) || '',
        syncKey: typeof obj.syncKey === 'string' ? obj.syncKey : '',
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Save Supabase config encrypted with the sync key.
 * The sync key is dual-purpose: encrypts credentials locally + validates access server-side.
 */
export async function saveSupabaseConfig(config: SupabaseConfig, syncKey: string): Promise<void> {
  const json = JSON.stringify({
    projectId: config.projectId,
    anonKey: config.anonKey,
    syncKey: config.syncKey,
  })
  const payload = await encrypt(json, syncKey)
  localStorage.setItem(CONFIG_KEY, JSON.stringify(payload))
}

/**
 * Save config in legacy plaintext format (used for migration).
 * @deprecated Use saveSupabaseConfig with password instead.
 */
export function saveSupabaseConfigLegacy(config: SupabaseConfig): void {
  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify({ pid: config.projectId, key: config.anonKey, syncKey: config.syncKey }),
  )
}

export function clearSyncConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
}

export function loadLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

export function saveLastSyncTime(isoString: string): void {
  localStorage.setItem(LAST_SYNC_KEY, isoString)
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

/** Validate Supabase config by checking connectivity */
export async function validateConfig(projectId: string, anonKey: string): Promise<boolean> {
  try {
    const url = buildSupabaseUrl(projectId)
    const sb = createClient(url, anonKey)
    // Test connectivity by calling the RPC function (will fail gracefully if not set up yet)
    const { error } = await sb.rpc('pull_sync', { p_sync_key: '' }).maybeSingle()
    // We just need to verify the connection works; PGRST404 means function doesn't exist yet
    // which is fine — the user will run the SQL first
    if (error && error.code !== '42883' && error.code !== 'PGRST301') {
      return false
    }
    return true
  } catch {
    return false
  }
}

/** Push local data via RPC (sync_key validated server-side) */
export async function pushData(config: SupabaseConfig, data: ChecklistData): Promise<string> {
  const sb = getSupabaseClient(config)
  const { data: result, error } = await sb.rpc('upsert_sync', {
    p_sync_key: config.syncKey,
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

/** Pull remote data via RPC (sync_key validated server-side) */
export async function pullData(
  config: SupabaseConfig,
): Promise<{ data: ChecklistData; updatedAt: string } | null> {
  const sb = getSupabaseClient(config)
  const { data: row, error } = await sb
    .rpc('pull_sync', { p_sync_key: config.syncKey })
    .maybeSingle<{ data: ChecklistData; updated_at: string }>()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new SyncError(`拉取失败: ${error.message}`, 'PULL_ERROR')
  }

  if (!row || !isChecklistData(row.data)) {
    throw new SyncError('云端数据格式无效', 'INVALID_DATA')
  }

  if (typeof row.updated_at !== 'string') {
    throw new SyncError('云端数据缺少更新时间', 'INVALID_DATA')
  }

  return {
    data: row.data,
    updatedAt: row.updated_at,
  }
}
