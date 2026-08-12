import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ChecklistData } from '../types'
import { isChecklistData } from './validation'
import { mergeChecklistData } from './dataMigration'
import { migrateLegacyStorageValue, removeStorageKey } from './legacyStorageMigration'
import { reportLegacyStorageConflict, reportLegacyStorageFailure } from './legacyStorageEvents'
import i18n from '../i18n'

const SYNC_TABLE = 'sync_data'

export interface SupabaseConfig {
  projectId: string
  anonKey: string
}

export interface CloudSyncState {
  projectId: string
  lastSeenAt: string | null
  lastSuccessfulSyncAt: string | null
}

const CONFIG_KEY = 'flowboard-cloud-config'
const SYNC_STATE_KEY = 'flowboard-cloud-sync-state'
const LEGACY_LAST_SYNC_KEY = 'flowboard-cloud-last-sync'
const LEGACY_LAST_SEEN_KEY = 'flowboard-cloud-last-seen'
const LEGACY_NTE_LAST_SYNC_KEY = 'nte-supabase-last-sync'
const LEGACY_NTE_LAST_SEEN_KEY = 'nte-supabase-last-seen'
const LEGACY_SYNC_KEYS = [
  LEGACY_LAST_SYNC_KEY,
  LEGACY_LAST_SEEN_KEY,
  LEGACY_NTE_LAST_SYNC_KEY,
  LEGACY_NTE_LAST_SEEN_KEY,
  `${LEGACY_LAST_SYNC_KEY}-corrupted-backup`,
  `${LEGACY_LAST_SEEN_KEY}-corrupted-backup`,
] as const

function parseSupabaseConfig(raw: string): SupabaseConfig | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const value = parsed as Record<string, unknown>
    if (
      typeof value.projectId !== 'string' ||
      !value.projectId.trim() ||
      typeof value.anonKey !== 'string' ||
      !value.anonKey.trim()
    ) {
      return null
    }
    return { projectId: value.projectId, anonKey: value.anonKey }
  } catch {
    return null
  }
}

function parseStoredTimestamp(raw: string): string | null {
  const value = raw.trim()
  return value && !Number.isNaN(Date.parse(value)) ? raw : null
}

function normalizedProjectUrl(projectId: string): string | null {
  try {
    return resolveSupabaseUrl(projectId)
  } catch {
    return projectId.trim() || null
  }
}

export function isSameSupabaseProject(left: string, right: string): boolean {
  return normalizedProjectUrl(left) === normalizedProjectUrl(right)
}

function parseCloudSyncState(raw: string): CloudSyncState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const value = parsed as Record<string, unknown>
    if (
      typeof value.projectId !== 'string' ||
      !value.projectId.trim() ||
      (value.lastSeenAt !== null &&
        (typeof value.lastSeenAt !== 'string' ||
          parseStoredTimestamp(value.lastSeenAt) === null)) ||
      (value.lastSuccessfulSyncAt !== null &&
        (typeof value.lastSuccessfulSyncAt !== 'string' ||
          parseStoredTimestamp(value.lastSuccessfulSyncAt) === null))
    ) {
      return null
    }
    return {
      projectId: value.projectId,
      lastSeenAt: value.lastSeenAt as string | null,
      lastSuccessfulSyncAt: value.lastSuccessfulSyncAt as string | null,
    }
  } catch {
    return null
  }
}

function removeLegacySyncKeys(): boolean {
  let removed = true
  for (const key of LEGACY_SYNC_KEYS) {
    if (!removeStorageKey(localStorage, key)) removed = false
  }
  if (!removed) reportLegacyStorageFailure()
  return removed
}

function readLegacyTimestamp(currentKey: string, legacyKey: string): string | null {
  const currentRaw = localStorage.getItem(currentKey)
  const legacyRaw = localStorage.getItem(legacyKey)
  const currentValue = currentRaw === null ? null : parseStoredTimestamp(currentRaw)
  const legacyValue = legacyRaw === null ? null : parseStoredTimestamp(legacyRaw)
  return currentValue ?? legacyValue
}

function cloudSyncStatesEqual(left: CloudSyncState, right: CloudSyncState): boolean {
  return (
    isSameSupabaseProject(left.projectId, right.projectId) &&
    left.lastSeenAt === right.lastSeenAt &&
    left.lastSuccessfulSyncAt === right.lastSuccessfulSyncAt
  )
}

export function resolveSupabaseUrl(projectUrlOrId: string): string {
  const value = projectUrlOrId.trim()

  if (/^https?:\/\//i.test(value)) {
    return new URL(value).origin
  }

  return `https://${value}.supabase.co`
}

export function loadSupabaseConfig(): SupabaseConfig | null {
  migrateLegacyStorageValue(localStorage, {
    currentKey: CONFIG_KEY,
    legacyKey: 'nte-supabase-config',
    parse: parseSupabaseConfig,
    serialize: JSON.stringify,
    equals: (left, right) => left.projectId === right.projectId && left.anonKey === right.anonKey,
    onConflict: reportLegacyStorageConflict,
    onFailure: reportLegacyStorageFailure,
  })
  const raw = localStorage.getItem(CONFIG_KEY)
  return raw ? parseSupabaseConfig(raw) : null
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearSyncConfig(): void {
  removeStorageKey(localStorage, CONFIG_KEY)
  removeStorageKey(localStorage, 'nte-supabase-config')
  removeStorageKey(localStorage, SYNC_STATE_KEY)
  removeLegacySyncKeys()
}

export function loadCloudSyncState(config: SupabaseConfig | null): CloudSyncState | null {
  try {
    if (!config) {
      removeStorageKey(localStorage, SYNC_STATE_KEY)
      removeLegacySyncKeys()
      return null
    }

    const raw = localStorage.getItem(SYNC_STATE_KEY)
    if (raw !== null) {
      const state = parseCloudSyncState(raw)
      if (state && isSameSupabaseProject(state.projectId, config.projectId)) {
        removeLegacySyncKeys()
        return state
      }
      if (state) {
        const emptyState: CloudSyncState = {
          projectId: config.projectId,
          lastSeenAt: null,
          lastSuccessfulSyncAt: null,
        }
        if (saveCloudSyncState(emptyState)) removeLegacySyncKeys()
        return emptyState
      }
    }

    const state: CloudSyncState = {
      projectId: config.projectId,
      lastSeenAt: readLegacyTimestamp(LEGACY_LAST_SEEN_KEY, LEGACY_NTE_LAST_SEEN_KEY),
      lastSuccessfulSyncAt: readLegacyTimestamp(LEGACY_LAST_SYNC_KEY, LEGACY_NTE_LAST_SYNC_KEY),
    }
    if (saveCloudSyncState(state)) removeLegacySyncKeys()
    return state
  } catch {
    reportLegacyStorageFailure()
    return null
  }
}

export function saveCloudSyncState(state: CloudSyncState): boolean {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state))
    const raw = localStorage.getItem(SYNC_STATE_KEY)
    const confirmed = raw === null ? null : parseCloudSyncState(raw)
    if (!confirmed || !cloudSyncStatesEqual(confirmed, state)) {
      reportLegacyStorageFailure()
      return false
    }
    return true
  } catch {
    reportLegacyStorageFailure()
    return false
  }
}

let client: SupabaseClient | null = null
let cachedConfig: SupabaseConfig | null = null

function getSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (
    !client ||
    cachedConfig?.projectId !== config.projectId ||
    cachedConfig?.anonKey !== config.anonKey
  ) {
    client = createClient(resolveSupabaseUrl(config.projectId), config.anonKey)
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

type ValidateReason =
  'network' | 'auth' | 'table_missing' | 'table_schema' | 'table_permission' | 'unknown'

export type ValidateResult = { ok: true } | { ok: false; reason: ValidateReason; detail?: string }

export async function validateConfig(projectUrl: string, anonKey: string): Promise<ValidateResult> {
  try {
    const url = resolveSupabaseUrl(projectUrl)
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

export interface CloudPushResult {
  outcome: 'applied' | 'conflict'
  updatedAt: string | null
}

export async function detectConditionalWriteCapability(config: SupabaseConfig): Promise<boolean> {
  const supabaseClient = getSupabaseClient(config)
  const { data, error } = await supabaseClient.rpc('flowboard_sync_capabilities')
  if (error) return false
  return Array.isArray(data) && data.includes('conditional_write_v1')
}

export async function pushData(
  config: SupabaseConfig,
  data: Record<string, unknown>,
  options?: { expectedUpdatedAt: string | null },
): Promise<CloudPushResult> {
  const supabaseClient = getSupabaseClient(config)
  const { data: result, error } = options
    ? await supabaseClient.rpc('upsert_sync_if_unchanged', {
        p_data: JSON.stringify(data, null, 2),
        p_expected_updated_at: options.expectedUpdatedAt,
      })
    : await supabaseClient.rpc('upsert_sync', {
        p_data: JSON.stringify(data, null, 2),
      })

  if (error) {
    throw new SyncError(i18n.t('sync.pushFailed', { message: error.message }), 'PUSH_ERROR')
  }

  if (!options && typeof result === 'string') {
    return { outcome: 'applied', updatedAt: result }
  }

  const row = Array.isArray(result) ? result[0] : result
  if (
    options &&
    row &&
    typeof row === 'object' &&
    'outcome' in row &&
    (row.outcome === 'applied' || row.outcome === 'conflict') &&
    'updated_at' in row &&
    (typeof row.updated_at === 'string' || row.updated_at === null)
  ) {
    return { outcome: row.outcome, updatedAt: row.updated_at }
  }

  throw new SyncError(i18n.t('sync.pushInvalid'), 'PUSH_ERROR')
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
