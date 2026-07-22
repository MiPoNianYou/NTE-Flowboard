import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ChecklistData } from '../types'
import { isChecklistData } from './validation'
import { mergeChecklistData } from './dataMigration'
import i18n from '../i18n'

const SYNC_TABLE = 'sync_data'

export interface SupabaseConfig {
  projectId: string
  anonKey: string
}

const CONFIG_KEY = 'flowboard-cloud-config'
const LAST_SYNC_KEY = 'flowboard-cloud-last-sync'
const LAST_SEEN_KEY = 'flowboard-cloud-last-seen'

function buildSupabaseUrl(projectUrlOrId: string): string {
  const value = projectUrlOrId.trim()

  if (/^https?:\/\//i.test(value)) {
    return new URL(value).origin
  }

  return `https://${value}.supabase.co`
}

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

export class SyncError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

export function classifySyncError(error: unknown): string {
  if (!(error instanceof SyncError)) return i18n.t('sync.failed')

  const errorMessage = error.message.toLowerCase()

  if (errorMessage.includes('column') && errorMessage.includes('does not exist'))
    return i18n.t('sync.tableSchema')
  if (errorMessage.includes('relation') && errorMessage.includes('does not exist'))
    return i18n.t('sync.tableMissing')

  if (errorMessage.includes('permission denied') || error.code === '42501')
    return i18n.t('sync.permission')
  if (errorMessage.includes('invalid api key') || error.code === '28P01')
    return i18n.t('sync.invalidKey')
  if (errorMessage.includes('failed to fetch') || !error.code) return i18n.t('sync.network')

  if (error.code === 'INVALID_DATA') return i18n.t('sync.invalidCloudData')

  return i18n.t('sync.retry')
}

export type ValidateReason =
  | 'network'
  | 'auth'
  | 'table_missing'
  | 'table_schema'
  | 'table_permission'
  | 'unknown'

export type ValidateResult = { ok: true } | { ok: false; reason: ValidateReason; detail?: string }

export async function validateConfig(projectUrl: string, anonKey: string): Promise<ValidateResult> {
  try {
    const url = buildSupabaseUrl(projectUrl)
    const supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: `flowboard-cloud-validate-${projectUrl}`,
      },
    })
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

export async function pushData(
  config: SupabaseConfig,
  data: Record<string, unknown>,
): Promise<string> {
  const supabaseClient = getSupabaseClient(config)
  const { data: result, error } = await supabaseClient.rpc('upsert_sync', {
    p_data: JSON.stringify(data, null, 2),
  })

  if (error) {
    throw new SyncError(i18n.t('sync.pushFailed', { message: error.message }), 'PUSH_ERROR')
  }

  if (typeof result !== 'string') {
    throw new SyncError(i18n.t('sync.pushInvalid'), 'PUSH_ERROR')
  }

  return result
}

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
    throw new SyncError(i18n.t('sync.pullFailed', { message: error.message }), 'PULL_ERROR')
  }

  if (!row) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(row.data)
  } catch {
    throw new SyncError(i18n.t('sync.cloudDataInvalid'), 'INVALID_DATA')
  }

  if (!isChecklistData(parsed)) {
    throw new SyncError(i18n.t('sync.cloudDataInvalid'), 'INVALID_DATA')
  }

  if (typeof row.updated_at !== 'string') {
    throw new SyncError(i18n.t('sync.missingUpdatedAt'), 'INVALID_DATA')
  }

  return {
    data: mergeChecklistData(parsed),
    updatedAt: row.updated_at,
  }
}
