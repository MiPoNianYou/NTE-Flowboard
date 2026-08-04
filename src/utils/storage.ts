import type { ChecklistData } from '../types'
import { migrateDataStructure, mergeChecklistData } from './dataMigration'
import { createDefaultChecklistData } from './defaultData'
import { isChecklistData } from './validation'

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
type ChecklistLoadError = 'invalid-checklist' | 'storage-read-failed' | 'corrupted-backup-failed'

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
}

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
    if (isChecklistData(parsed)) {
      return {
        snapshot: {
          data: mergeChecklistData(parsed),
          revision: parseLegacyRevision(legacyRevision),
        },
        enveloped: false,
      }
    }
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
      const envelope = parsed as { data?: unknown; revision?: unknown }
      if (isChecklistData(envelope.data)) {
        return {
          snapshot: {
            data: mergeChecklistData(envelope.data),
            revision: parseRevision(envelope.revision),
          },
          enveloped: true,
        }
      }
    }
  } catch {
    return null
  }
  return null
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
  const autoMove =
    storage.getItem('nte-auto-move-completed') ?? storage.getItem('flowboard-setting-auto-move')
  const confirmDelete =
    storage.getItem('nte-confirm-delete') ?? storage.getItem('flowboard-setting-confirm-delete')
  if (autoMove !== null) {
    next.settings.isAutoMoveEnabled = autoMove !== 'false'
    changed = true
  }
  if (confirmDelete !== null) {
    next.settings.shouldConfirmDelete = confirmDelete !== 'false'
    changed = true
  }

  const settings = storage.getItem('flowboard-settings')
  if (settings) {
    try {
      next.settings = {
        ...next.settings,
        ...(JSON.parse(settings) as Partial<ChecklistData['settings']>),
      }
      changed = true
    } catch {
      // Keep valid checklist settings when standalone legacy JSON is malformed.
    }
  }
  const uiPreferences = storage.getItem('flowboard-ui-preferences')
  if (uiPreferences) {
    try {
      next.uiPreferences = {
        ...next.uiPreferences,
        ...(JSON.parse(uiPreferences) as Partial<ChecklistData['uiPreferences']>),
      }
      changed = true
    } catch {
      // Keep valid checklist preferences when standalone legacy JSON is malformed.
    }
  }
  return changed ? next : data
}

function clearLegacyChecklistKeys(storage: Storage) {
  for (const key of [
    LEGACY_DATA_KEY,
    'nte-corrupted-backup',
    'nte-auto-move-completed',
    'nte-confirm-delete',
    'flowboard-setting-auto-move',
    'flowboard-setting-confirm-delete',
    'flowboard-settings',
    'flowboard-ui-preferences',
  ]) {
    storage.removeItem(key)
  }
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
    storage.removeItem(LEGACY_REVISION_KEY)
    const confirmed = readStored()?.snapshot
    if (!confirmed || compareRevisions(confirmed.revision, revision) < 0) {
      throw new Error('Checklist revision was superseded during save')
    }
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
      let migrated = false
      if (!storage.getItem(STORAGE_KEY)) {
        const legacyRaw = storage.getItem(LEGACY_DATA_KEY)
        if (legacyRaw) {
          const legacyData = migrateDataStructure(JSON.parse(legacyRaw))
          if (!isChecklistData(legacyData)) throw new Error('Invalid legacy checklist')
          const migratedData = applyLegacyChecklistSettings(storage, mergeChecklistData(legacyData))
          const snapshot = write(migratedData, EMPTY_CHECKLIST_REVISION)
          clearLegacyChecklistKeys(storage)
          return { status: 'migrated', snapshot, error: null }
        }
      }

      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) {
        return {
          status: 'defaulted',
          snapshot: { data: createDefaultData(), revision: EMPTY_CHECKLIST_REVISION },
          error: null,
        }
      }
      const parsed = readStored()
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

      const withLegacySettings = applyLegacyChecklistSettings(storage, parsed.snapshot.data)
      if (withLegacySettings !== parsed.snapshot.data) {
        const snapshot = write(withLegacySettings, parsed.snapshot.revision)
        clearLegacyChecklistKeys(storage)
        return { status: 'migrated', snapshot, error: null }
      }
      if (!parsed.enveloped) migrated = true
      if (migrated) {
        const snapshot = write(parsed.snapshot.data, parsed.snapshot.revision)
        return { status: 'migrated', snapshot, error: null }
      }
      return { status: 'loaded', snapshot: parsed.snapshot, error: null }
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
