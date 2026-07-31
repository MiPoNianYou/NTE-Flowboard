import type { ChecklistData, ChecklistItem } from '../types'
import { MS } from './constants'
import { isChecklistData } from './validation'
import { migrateDataStructure, mergeChecklistData } from './dataMigration'
import { createDefaultChecklistData } from './defaultData'
import { toastBus } from './toastBus'
import { getEffectiveLocale } from '../i18n/displayPreferences'
import i18n from '../i18n'

const STORAGE_KEY = 'flowboard-checklist'
const CORRUPTED_BACKUP_KEY = 'flowboard-corrupted-backup'
const REVISION_KEY = 'flowboard-checklist-revision'

export interface ChecklistRevision {
  counter: number
  writerId: string
}

export interface StoredChecklistSnapshot {
  data: ChecklistData
  revision: ChecklistRevision
}

export interface ChecklistStorageAdapter {
  read: () => Promise<StoredChecklistSnapshot | null>
  save: (data: ChecklistData, knownRevision: ChecklistRevision) => Promise<StoredChecklistSnapshot>
  flushNow: (data: ChecklistData, knownRevision: ChecklistRevision) => void
  subscribe: (listener: (revision: ChecklistRevision) => void) => () => void
}

const EMPTY_REVISION: ChecklistRevision = { counter: 0, writerId: '' }

export function compareChecklistRevisions(
  left: ChecklistRevision,
  right: ChecklistRevision,
): number {
  if (left.counter !== right.counter) return left.counter - right.counter
  return left.writerId.localeCompare(right.writerId)
}

function createWriterId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function parseRevision(raw: string | null): ChecklistRevision {
  if (!raw) return EMPTY_REVISION
  try {
    const parsed = JSON.parse(raw) as Partial<ChecklistRevision>
    if (typeof parsed.counter === 'number' && typeof parsed.writerId === 'string') {
      return { counter: parsed.counter, writerId: parsed.writerId }
    }
  } catch {
    // Treat an invalid revision as an unversioned legacy snapshot.
  }
  return EMPTY_REVISION
}

function nextRevision(knownRevision: ChecklistRevision, writerId: string): ChecklistRevision {
  const storedRevision = parseRevision(localStorage.getItem(REVISION_KEY))
  return {
    counter: Math.max(knownRevision.counter, storedRevision.counter) + 1,
    writerId,
  }
}

function readStoredSnapshot(): StoredChecklistSnapshot | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isChecklistData(parsed)) {
      return {
        data: mergeChecklistData(parsed),
        revision: parseRevision(localStorage.getItem(REVISION_KEY)),
      }
    }
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
      const envelope = parsed as { data?: unknown; revision?: unknown }
      if (isChecklistData(envelope.data)) {
        const revision = envelope.revision as Partial<ChecklistRevision> | undefined
        const normalizedRevision =
          typeof revision?.counter === 'number' && typeof revision.writerId === 'string'
            ? { counter: revision.counter, writerId: revision.writerId }
            : parseRevision(localStorage.getItem(REVISION_KEY))
        return {
          data: mergeChecklistData(envelope.data),
          revision: normalizedRevision,
        }
      }
    }
  } catch {
    return null
  }
  return null
}

export function createChecklistStorageAdapter(): ChecklistStorageAdapter {
  const writerId = createWriterId()
  let legacyRevision: ChecklistRevision | null = null

  const write = (
    data: ChecklistData,
    knownRevision: ChecklistRevision,
  ): StoredChecklistSnapshot => {
    const revision = nextRevision(knownRevision, writerId)
    const envelope = JSON.stringify({ data, revision })
    localStorage.setItem(STORAGE_KEY, envelope)
    localStorage.setItem(REVISION_KEY, JSON.stringify(revision))
    const stored = readStoredSnapshot()
    if (!stored || compareChecklistRevisions(stored.revision, revision) < 0) {
      throw new Error('Checklist revision was superseded during save')
    }
    return stored
  }

  return {
    read: async () => {
      const snapshot = readStoredSnapshot()
      if (!snapshot) return null
      if (snapshot.revision.counter === 0 && legacyRevision) {
        return { ...snapshot, revision: legacyRevision }
      }
      return snapshot
    },
    save: async (data, knownRevision) => write(data, knownRevision),
    flushNow: (data, knownRevision) => {
      try {
        write(data, knownRevision)
      } catch {
        // Unload paths cannot surface async persistence errors.
      }
    },
    subscribe: (listener) => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY && event.key !== REVISION_KEY) return
        const snapshot = readStoredSnapshot()
        if (snapshot) {
          if (snapshot.revision.counter === 0) {
            legacyRevision = { counter: Date.now(), writerId: 'legacy' }
            listener(legacyRevision)
          } else {
            listener(snapshot.revision)
          }
        }
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },
  }
}

function notifyStorageError(error: unknown, context: string): void {
  const errorInstance = error instanceof Error ? error : new Error(String(error))
  console.error(`[Storage] ${context}:`, errorInstance.message)
  toastBus.emit(`${context}：${errorInstance.message}`, 'error')
}

function migrateLegacyKeys(): void {
  const oldDataKey = 'nte-checklist-data'
  const rawData = localStorage.getItem(oldDataKey)
  if (rawData) {
    try {
      const parsed = JSON.parse(rawData)
      const migrated = migrateDataStructure(parsed)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    } catch {
      console.warn(`[Storage] ${i18n.t('storage.legacyMigrationFailed')}`)
      return
    }
    localStorage.removeItem(oldDataKey)
    localStorage.removeItem('nte-corrupted-backup')
  }

  const simpleMigrations: [string, string][] = [
    ['nte-supabase-config', 'flowboard-cloud-config'],
    ['nte-supabase-last-sync', 'flowboard-cloud-last-sync'],
    ['nte-supabase-last-seen', 'flowboard-cloud-last-seen'],
    ['nte-tab', 'flowboard-active-tab'],
    ['nte-item-heights', 'flowboard-item-heights'],
    ['nte-auto-move-completed', 'flowboard-setting-auto-move'],
    ['nte-confirm-delete', 'flowboard-setting-confirm-delete'],
    ['nte-hidden-section-open', 'flowboard-hidden-section-open'],
    ['tag-color-map', 'flowboard-tag-colors'],
  ]
  for (const [oldKey, newKey] of simpleMigrations) {
    const val = localStorage.getItem(oldKey)
    if (val !== null) {
      localStorage.setItem(newKey, val)
      localStorage.removeItem(oldKey)
    }
  }

  const standaloneBehaviorSettings = [
    ['flowboard-setting-auto-move', 'isAutoMoveEnabled'],
    ['flowboard-setting-confirm-delete', 'shouldConfirmDelete'],
  ] as const
  const pendingStandaloneSettings = standaloneBehaviorSettings.flatMap(
    ([storageKey, settingKey]) => {
      const value = localStorage.getItem(storageKey)
      return value === null ? [] : [{ storageKey, settingKey, value }]
    },
  )
  const rawChecklistWithStandaloneSettings = localStorage.getItem(STORAGE_KEY)
  if (rawChecklistWithStandaloneSettings && pendingStandaloneSettings.length > 0) {
    try {
      const parsedChecklist = JSON.parse(rawChecklistWithStandaloneSettings) as Record<
        string,
        unknown
      >
      const checklistData =
        typeof parsedChecklist.data === 'object' && parsedChecklist.data !== null
          ? (parsedChecklist.data as Record<string, unknown>)
          : parsedChecklist
      const settings = (checklistData.settings as Record<string, unknown> | undefined) ?? {}

      for (const { storageKey, settingKey, value } of pendingStandaloneSettings) {
        if (!(settingKey in settings)) settings[settingKey] = value !== 'false'
        localStorage.removeItem(storageKey)
      }

      checklistData.settings = settings
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedChecklist))
    } catch {
      // Keep standalone settings available if the checklist cannot be migrated yet.
    }
  }

  const rawSettings = localStorage.getItem('flowboard-settings')
  if (rawSettings) {
    try {
      const parsedSettings = JSON.parse(rawSettings) as Record<string, unknown>
      const rawChecklist = localStorage.getItem(STORAGE_KEY)
      if (rawChecklist) {
        const parsedChecklist = JSON.parse(rawChecklist) as Record<string, unknown>
        parsedChecklist.settings = {
          ...(parsedChecklist.settings as Record<string, unknown> | undefined),
          ...parsedSettings,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedChecklist))
      }
    } catch {
      void 0
    }
    localStorage.removeItem('flowboard-settings')
  }

  const rawUiPrefs = localStorage.getItem('flowboard-ui-preferences')
  if (rawUiPrefs) {
    try {
      const parsedUiPrefs = JSON.parse(rawUiPrefs) as Record<string, unknown>
      const rawChecklist = localStorage.getItem(STORAGE_KEY)
      if (rawChecklist) {
        const parsedChecklist = JSON.parse(rawChecklist) as Record<string, unknown>
        parsedChecklist.uiPreferences = {
          ...(parsedChecklist.uiPreferences as Record<string, unknown> | undefined),
          ...parsedUiPrefs,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedChecklist))
      }
    } catch {
      void 0
    }
    localStorage.removeItem('flowboard-ui-preferences')
  }
}

function backupCorruptedData(raw: string): void {
  try {
    localStorage.setItem(CORRUPTED_BACKUP_KEY, raw)
    notifyStorageError(new Error(i18n.t('storage.invalidBackup')), i18n.t('storage.recovery'))
  } catch {
    void 0
  }
}

export function loadData(): ChecklistData {
  try {
    migrateLegacyKeys()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultChecklistData(getEffectiveLocale())
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'data' in parsed &&
      isChecklistData((parsed as { data?: unknown }).data)
    ) {
      return mergeChecklistData((parsed as { data: ChecklistData }).data)
    }
    if (!isChecklistData(parsed)) {
      backupCorruptedData(raw)
      return createDefaultChecklistData(getEffectiveLocale())
    }
    return mergeChecklistData(parsed)
  } catch (error) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) backupCorruptedData(raw)
    notifyStorageError(error, i18n.t('storage.loadFailed'))
    return createDefaultChecklistData(getEffectiveLocale())
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function cancelPendingSave(): void {
  if (!saveTimeout) return
  clearTimeout(saveTimeout)
  saveTimeout = null
}

export function saveData(data: ChecklistData): void {
  cancelPendingSave()
  saveTimeout = setTimeout(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY)
      if (existing) {
        try {
          const parsed = JSON.parse(existing) as { data?: unknown }
          if (parsed && typeof parsed === 'object' && 'data' in parsed) {
            saveTimeout = null
            return
          }
        } catch {
          // Continue with the legacy writer for malformed data.
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      notifyStorageError(error, i18n.t('storage.saveFailed'))
    }
    saveTimeout = null
  }, MS.STORAGE_DEBOUNCE)
}

export function saveDataImmediate(data: ChecklistData): void {
  cancelPendingSave()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    notifyStorageError(error, i18n.t('storage.saveFailed'))
  }
}

export function resetItems(items: ChecklistItem[]): ChecklistItem[] {
  let hasChanges = false
  const reset = items.map((item) => {
    if (!item.isCompleted) return item
    hasChanges = true
    return { ...item, isCompleted: false }
  })
  return hasChanges ? reset : items
}
