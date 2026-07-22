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

export function isChecklistStorageKey(key: string | null): boolean {
  return key === STORAGE_KEY
}

export function cancelPendingSave(): void {
  if (!saveTimeout) return
  clearTimeout(saveTimeout)
  saveTimeout = null
}

export function saveData(data: ChecklistData): void {
  cancelPendingSave()
  saveTimeout = setTimeout(() => {
    try {
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
  return items.map((item) => ({ ...item, isCompleted: false }))
}
