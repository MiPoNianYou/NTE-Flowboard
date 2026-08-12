import type { ChecklistData } from '../types'
import { migrateDataStructure, mergeChecklistData } from './dataMigration'
import { createDefaultChecklistData } from './defaultData'
import { isChecklistData } from './validation'
import { removeStorageKey } from './legacyStorageMigration'
import { reportLegacyStorageFailure } from './legacyStorageEvents'

const STORAGE_KEY = 'flowboard-checklist'
const CORRUPTED_BACKUP_KEY = 'flowboard-corrupted-backup'
const LEGACY_REVISION_KEY = 'flowboard-checklist-revision'
const LEGACY_DATA_KEY = 'nte-checklist-data'

declare const checklistRevisionBrand: unique symbol
export type ChecklistRevision = string & { readonly [checklistRevisionBrand]: true }

export const EMPTY_CHECKLIST_REVISION = '0:' as ChecklistRevision

export interface StoredChecklistSnapshot {
  data: ChecklistData
  revision: ChecklistRevision
}

type ChecklistLoadStatus = 'loaded' | 'defaulted' | 'migrated' | 'recovered'
type ChecklistLoadError =
  | 'invalid-checklist'
  | 'storage-read-failed'
  | 'corrupted-backup-failed'
  | 'legacy-conflict'
  | 'legacy-cleanup-failed'

interface ChecklistStorageLoadResult {
  status: ChecklistLoadStatus
  snapshot: StoredChecklistSnapshot
  error: ChecklistLoadError | null
}

export interface ChecklistStorageAdapter {
  load: () => ChecklistStorageLoadResult
  save: (data: ChecklistData, knownRevision: ChecklistRevision) => StoredChecklistSnapshot
  flush: (data: ChecklistData, knownRevision: ChecklistRevision) => StoredChecklistSnapshot
  isNewer: (candidate: ChecklistRevision, current: ChecklistRevision) => boolean
  subscribe: (listener: (snapshot: StoredChecklistSnapshot) => void) => () => void
}

export interface ChecklistStorageAdapterOptions {
  storage?: Storage | null
  createDefaultData?: () => ChecklistData
  createWriterId?: () => string
}

interface RevisionParts {
  counter: number
  writerId: string
}

interface ParsedStoredChecklist {
  snapshot: StoredChecklistSnapshot
  enveloped: boolean
  migratedStructure: boolean
}

const LEGACY_AUTO_MOVE_KEYS = ['nte-auto-move-completed', 'flowboard-setting-auto-move'] as const
const LEGACY_CONFIRM_DELETE_KEYS = [
  'nte-confirm-delete',
  'flowboard-setting-confirm-delete',
] as const
const LEGACY_SETTINGS_KEYS = ['flowboard-settings', 'flowboard-ui-preferences'] as const
const LEGACY_STANDALONE_KEYS = [
  ...LEGACY_AUTO_MOVE_KEYS,
  ...LEGACY_CONFIRM_DELETE_KEYS,
  ...LEGACY_SETTINGS_KEYS,
] as const
function parseRevision(value: unknown): ChecklistRevision {
  if (typeof value === 'string') {
    const separator = value.indexOf(':')
    const counter = Number(value.slice(0, separator))
    if (separator > 0 && Number.isSafeInteger(counter) && counter >= 0) {
      return value as ChecklistRevision
    }
  }
  if (typeof value === 'object' && value !== null) {
    const legacy = value as { counter?: unknown; writerId?: unknown }
    if (
      typeof legacy.counter === 'number' &&
      Number.isSafeInteger(legacy.counter) &&
      typeof legacy.writerId === 'string'
    ) {
      return `${legacy.counter}:${legacy.writerId}` as ChecklistRevision
    }
  }
  return EMPTY_CHECKLIST_REVISION
}

function revisionParts(revision: ChecklistRevision): RevisionParts {
  const separator = revision.indexOf(':')
  return {
    counter: Number(revision.slice(0, separator)) || 0,
    writerId: revision.slice(separator + 1),
  }
}

function compareRevisions(left: ChecklistRevision, right: ChecklistRevision): number {
  const leftParts = revisionParts(left)
  const rightParts = revisionParts(right)
  if (leftParts.counter !== rightParts.counter) return leftParts.counter - rightParts.counter
  return leftParts.writerId.localeCompare(rightParts.writerId)
}

function parseStoredChecklist(
  raw: string | null,
  legacyRevision: string | null,
): ParsedStoredChecklist | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const direct = parseChecklistData(parsed)
    if (direct) {
      return {
        snapshot: {
          data: direct.data,
          revision: parseLegacyRevision(legacyRevision),
        },
        enveloped: false,
        migratedStructure: direct.migrated,
      }
    }
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
      const envelope = parsed as { data?: unknown; revision?: unknown }
      const envelopeData = parseChecklistData(envelope.data)
      if (envelopeData) {
        return {
          snapshot: {
            data: envelopeData.data,
            revision: parseRevision(envelope.revision),
          },
          enveloped: true,
          migratedStructure: envelopeData.migrated,
        }
      }
    }
  } catch {
    return null
  }
  return null
}

function parseChecklistData(value: unknown): { data: ChecklistData; migrated: boolean } | null {
  if (isChecklistData(value)) {
    return { data: mergeChecklistData(structuredClone(value)), migrated: false }
  }
  const migrated = migrateDataStructure(structuredClone(value))
  if (!isChecklistData(migrated)) return null
  return { data: mergeChecklistData(migrated), migrated: true }
}

function parseLegacyChecklist(raw: string): ChecklistData | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return parseChecklistData(parsed)?.data ?? null
  } catch {
    return null
  }
}

function checklistDataEquals(left: ChecklistData, right: ChecklistData): boolean {
  const withoutIds = (data: ChecklistData) => ({
    ...data,
    daily: data.daily.map(({ id: _id, ...item }) => item),
    weekly: data.weekly.map(({ id: _id, ...item }) => item),
    monthly: data.monthly.map(({ id: _id, ...item }) => item),
  })
  return JSON.stringify(withoutIds(left)) === JSON.stringify(withoutIds(right))
}

function parseLegacyRevision(raw: string | null): ChecklistRevision {
  if (!raw) return EMPTY_CHECKLIST_REVISION
  try {
    return parseRevision(JSON.parse(raw))
  } catch {
    return EMPTY_CHECKLIST_REVISION
  }
}

function applyLegacyChecklistSettings(storage: Storage, data: ChecklistData): ChecklistData {
  const next = structuredClone(data)
  let changed = false
  const firstValidBoolean = (keys: readonly string[]) =>
    keys
      .map((key) => storage.getItem(key))
      .find((value) => value === 'true' || value === 'false') ?? null
  const autoMove = firstValidBoolean(LEGACY_AUTO_MOVE_KEYS)
  const confirmDelete = firstValidBoolean(LEGACY_CONFIRM_DELETE_KEYS)
  if (autoMove === 'true' || autoMove === 'false') {
    next.settings.isAutoMoveEnabled = autoMove === 'true'
    changed = true
  }
  if (confirmDelete === 'true' || confirmDelete === 'false') {
    next.settings.shouldConfirmDelete = confirmDelete === 'true'
    changed = true
  }

  const settings = storage.getItem('flowboard-settings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings) as Record<string, unknown>
      for (const key of ['serverRegion', 'isAutoMoveEnabled', 'shouldConfirmDelete'] as const) {
        const value = parsed[key]
        if (
          (key === 'serverRegion' &&
            (value === 'asia' || value === 'america' || value === 'europe')) ||
          ((key === 'isAutoMoveEnabled' || key === 'shouldConfirmDelete') &&
            typeof value === 'boolean')
        ) {
          next.settings[key] = value as never
          changed = true
        }
      }
    } catch {
      // Keep valid checklist settings when standalone legacy JSON is malformed.
    }
  }
  const uiPreferences = storage.getItem('flowboard-ui-preferences')
  if (uiPreferences) {
    try {
      const parsed = JSON.parse(uiPreferences) as Record<string, unknown>
      if (typeof parsed.cloudPatchHidden === 'boolean') {
        next.uiPreferences.cloudPatchHidden = parsed.cloudPatchHidden
        changed = true
      }
    } catch {
      // Keep valid checklist preferences when standalone legacy JSON is malformed.
    }
  }
  return changed ? next : data
}

function legacyStandaloneSettingsConflict(
  storage: Storage,
  data: ChecklistData,
  cleanup = true,
): { conflict: boolean; cleanupFailed: boolean } {
  let conflict = false
  let cleanupFailed = false
  const cleanupKey = (key: string) => {
    if (!removeStorageKey(storage, key)) {
      cleanupFailed = true
      reportLegacyStorageFailure()
    }
  }
  const compareBoolean = (key: string, current: boolean) => {
    const raw = storage.getItem(key)
    if (raw === null) return
    if (raw !== 'true' && raw !== 'false') {
      if (cleanup) cleanupKey(key)
      return
    }
    if ((raw === 'true') === current) {
      if (cleanup) cleanupKey(key)
      return
    }
    conflict = true
  }

  for (const key of LEGACY_AUTO_MOVE_KEYS) {
    compareBoolean(key, data.settings.isAutoMoveEnabled)
  }
  for (const key of LEGACY_CONFIRM_DELETE_KEYS) {
    compareBoolean(key, data.settings.shouldConfirmDelete)
  }

  const compareJson = (
    key: string,
    current: Record<string, unknown>,
    allowedKeys: readonly string[],
  ) => {
    const raw = storage.getItem(key)
    if (raw === null) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        if (cleanup) cleanupKey(key)
        return
      }
      const entries = Object.entries(parsed).filter(([entryKey]) => allowedKeys.includes(entryKey))
      if (entries.length === 0) {
        if (cleanup) cleanupKey(key)
        return
      }
      const validEntries = entries.every(([entryKey, value]) => {
        if (entryKey === 'serverRegion')
          return value === 'asia' || value === 'america' || value === 'europe'
        return typeof value === 'boolean'
      })
      if (!validEntries) {
        if (cleanup) cleanupKey(key)
        return
      }
      if (entries.every(([entryKey, value]) => current[entryKey] === value)) {
        if (cleanup) cleanupKey(key)
      } else {
        conflict = true
      }
    } catch {
      if (cleanup) cleanupKey(key)
    }
  }

  compareJson(LEGACY_SETTINGS_KEYS[0], data.settings as unknown as Record<string, unknown>, [
    'serverRegion',
    'isAutoMoveEnabled',
    'shouldConfirmDelete',
  ])
  compareJson(LEGACY_SETTINGS_KEYS[1], data.uiPreferences as unknown as Record<string, unknown>, [
    'cloudPatchHidden',
  ])
  return { conflict, cleanupFailed }
}

function cleanupLegacyKey(storage: Storage, key: string): boolean {
  const removed = removeStorageKey(storage, key)
  if (!removed) reportLegacyStorageFailure()
  return removed
}

export function createChecklistStorageAdapter({
  storage = getStorage(),
  createDefaultData = () => createDefaultChecklistData('zh-CN'),
  createWriterId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
}: ChecklistStorageAdapterOptions = {}): ChecklistStorageAdapter {
  const writerId = createWriterId()

  const readStored = (): ParsedStoredChecklist | null => {
    if (!storage) return null
    return parseStoredChecklist(storage.getItem(STORAGE_KEY), storage.getItem(LEGACY_REVISION_KEY))
  }

  const write = (
    data: ChecklistData,
    knownRevision: ChecklistRevision,
  ): StoredChecklistSnapshot => {
    if (!storage) throw new Error('Checklist storage is unavailable')
    const storedRevision = readStored()?.snapshot.revision ?? EMPTY_CHECKLIST_REVISION
    const counter =
      Math.max(revisionParts(knownRevision).counter, revisionParts(storedRevision).counter) + 1
    const revision = `${counter}:${writerId}` as ChecklistRevision
    const snapshot = { data: structuredClone(data), revision }
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    const confirmed = readStored()?.snapshot
    if (
      !confirmed ||
      compareRevisions(confirmed.revision, revision) < 0 ||
      JSON.stringify(confirmed.data) !== JSON.stringify(snapshot.data)
    ) {
      throw new Error('Checklist revision was superseded during save')
    }
    cleanupLegacyKey(storage, LEGACY_REVISION_KEY)
    return confirmed
  }

  const load = (): ChecklistStorageLoadResult => {
    if (!storage) {
      return {
        status: 'recovered',
        snapshot: { data: createDefaultData(), revision: EMPTY_CHECKLIST_REVISION },
        error: 'storage-read-failed',
      }
    }
    try {
      let cleanupFailed = false
      const cleanup = (key: string) => {
        if (!cleanupLegacyKey(storage, key)) cleanupFailed = true
      }
      const migrationError = (conflict: boolean): ChecklistLoadError | null =>
        cleanupFailed ? 'legacy-cleanup-failed' : conflict ? 'legacy-conflict' : null
      const raw = storage.getItem(STORAGE_KEY)
      const legacyRaw = storage.getItem(LEGACY_DATA_KEY)
      const legacyRevisionRaw = storage.getItem(LEGACY_REVISION_KEY)
      cleanup('nte-corrupted-backup')
      const legacyData = legacyRaw === null ? null : parseLegacyChecklist(legacyRaw)
      if (legacyRaw !== null && !legacyData) cleanup(LEGACY_DATA_KEY)

      const parsed = parseStoredChecklist(raw, storage.getItem(LEGACY_REVISION_KEY))
      if (!parsed && legacyData) {
        if (raw !== null) {
          try {
            storage.setItem(CORRUPTED_BACKUP_KEY, raw)
            if (storage.getItem(CORRUPTED_BACKUP_KEY) !== raw) {
              throw new Error('Corrupted checklist backup verification failed')
            }
          } catch {
            return {
              status: 'recovered',
              snapshot: { data: createDefaultData(), revision: EMPTY_CHECKLIST_REVISION },
              error: 'corrupted-backup-failed',
            }
          }
        }
        const migratedData = applyLegacyChecklistSettings(storage, legacyData)
        const snapshot = write(migratedData, EMPTY_CHECKLIST_REVISION)
        cleanup(LEGACY_DATA_KEY)
        const settingsResult = legacyStandaloneSettingsConflict(storage, snapshot.data, true)
        cleanup('nte-corrupted-backup')
        cleanup(LEGACY_REVISION_KEY)
        cleanupFailed ||= settingsResult.cleanupFailed
        return {
          status: 'migrated',
          snapshot,
          error: migrationError(settingsResult.conflict),
        }
      }

      if (!raw) {
        const hasStandaloneLegacy =
          LEGACY_STANDALONE_KEYS.some((key) => storage.getItem(key) !== null) ||
          legacyRevisionRaw !== null
        if (hasStandaloneLegacy) {
          const migratedData = applyLegacyChecklistSettings(storage, createDefaultData())
          const snapshot = write(migratedData, EMPTY_CHECKLIST_REVISION)
          const settingsResult = legacyStandaloneSettingsConflict(storage, snapshot.data, true)
          cleanup('nte-corrupted-backup')
          cleanup(LEGACY_REVISION_KEY)
          cleanupFailed ||= settingsResult.cleanupFailed
          return {
            status: 'migrated',
            snapshot,
            error: migrationError(settingsResult.conflict),
          }
        }
        return {
          status: 'defaulted',
          snapshot: { data: createDefaultData(), revision: EMPTY_CHECKLIST_REVISION },
          error: migrationError(false),
        }
      }
      if (!parsed) {
        let error: ChecklistLoadError = 'invalid-checklist'
        try {
          storage.setItem(CORRUPTED_BACKUP_KEY, raw)
        } catch {
          error = 'corrupted-backup-failed'
        }
        return {
          status: 'recovered',
          snapshot: { data: createDefaultData(), revision: EMPTY_CHECKLIST_REVISION },
          error,
        }
      }

      let legacyConflict = false
      const needsWrite = !parsed.enveloped || parsed.migratedStructure
      if (legacyData) {
        if (checklistDataEquals(parsed.snapshot.data, legacyData)) {
          if (!needsWrite) cleanup(LEGACY_DATA_KEY)
        } else {
          legacyConflict = true
        }
      }
      const settingsResult = legacyStandaloneSettingsConflict(
        storage,
        parsed.snapshot.data,
        !needsWrite,
      )
      legacyConflict = settingsResult.conflict || legacyConflict
      cleanupFailed ||= settingsResult.cleanupFailed
      if (!needsWrite && storage.getItem(LEGACY_REVISION_KEY) !== null) cleanup(LEGACY_REVISION_KEY)
      cleanup('nte-corrupted-backup')

      if (needsWrite) {
        if (parsed.migratedStructure && raw !== null) {
          storage.setItem(CORRUPTED_BACKUP_KEY, raw)
          if (storage.getItem(CORRUPTED_BACKUP_KEY) !== raw) {
            throw new Error('Checklist structure backup verification failed')
          }
        }
        const snapshot = write(parsed.snapshot.data, parsed.snapshot.revision)
        if (legacyData && checklistDataEquals(parsed.snapshot.data, legacyData)) {
          cleanup(LEGACY_DATA_KEY)
        }
        const migratedSettingsResult = legacyStandaloneSettingsConflict(
          storage,
          parsed.snapshot.data,
          true,
        )
        legacyConflict ||= migratedSettingsResult.conflict
        cleanupFailed ||= migratedSettingsResult.cleanupFailed
        if (storage.getItem(LEGACY_REVISION_KEY) !== null) cleanup(LEGACY_REVISION_KEY)
        return {
          status: 'migrated',
          snapshot,
          error: migrationError(legacyConflict),
        }
      }
      return {
        status: 'loaded',
        snapshot: parsed.snapshot,
        error: migrationError(legacyConflict),
      }
    } catch {
      return {
        status: 'recovered',
        snapshot: { data: createDefaultData(), revision: EMPTY_CHECKLIST_REVISION },
        error: 'storage-read-failed',
      }
    }
  }

  return {
    load,
    save: write,
    flush: write,
    isNewer: (candidate, current) => compareRevisions(candidate, current) > 0,
    subscribe: (listener) => {
      if (typeof window === 'undefined' || !storage) return () => undefined
      const handleStorage = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY || !event.newValue) return
        const parsed = parseStoredChecklist(event.newValue, null)
        if (parsed) listener(parsed.snapshot)
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },
  }
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}
