import type { ChecklistData, ChecklistItem } from '../types'
import { MS } from './constants'
import { isChecklistData } from './validation'
import { migrateDataStructure, mergeChecklistData } from './dataMigration'
import { DEFAULT_CHECKLIST_DATA } from './seed'
import { toastBus } from './toastBus'

const STORAGE_KEY = 'flowboard-checklist'
const CORRUPTED_BACKUP_KEY = 'flowboard-corrupted-backup'

// --- 错误通知 ---

function notifyStorageError(error: unknown, context: string): void {
  const errorInstance = error instanceof Error ? error : new Error(String(error))
  console.error(`[Storage] ${context}:`, errorInstance.message)
  toastBus.emit(`${context}：${errorInstance.message}`, 'error')
}

// --- 一次性 key 迁移 ---

function migrateLegacyKeys(): void {
  const oldDataKey = 'nte-checklist-data'
  const rawData = localStorage.getItem(oldDataKey)
  if (rawData) {
    try {
      const parsed = JSON.parse(rawData)
      const migrated = migrateDataStructure(parsed)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    } catch {
      console.warn('[Storage] 旧数据迁移失败，下次启动将重试')
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

  // 将独立的 flowboard-settings 合并进 flowboard-checklist.settings，然后删除独立 key
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
      // 迁移失败无需阻断，ChecklistData.settings 会使用默认值
    }
    localStorage.removeItem('flowboard-settings')
  }

  // 将独立的 flowboard-ui-preferences 合并进 flowboard-checklist.uiPreferences，然后删除独立 key
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
      // 迁移失败无需阻断，ChecklistData.uiPreferences 会使用默认值
    }
    localStorage.removeItem('flowboard-ui-preferences')
  }
}

function backupCorruptedData(raw: string): void {
  try {
    localStorage.setItem(CORRUPTED_BACKUP_KEY, raw)
    notifyStorageError(new Error('数据格式异常，已备份原始数据'), '数据恢复')
  } catch {
    // 备份失败无能为力
  }
}

// --- 公开 I/O ---

export function loadData(): ChecklistData {
  try {
    migrateLegacyKeys()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_CHECKLIST_DATA)
    const parsed: unknown = JSON.parse(raw)
    if (!isChecklistData(parsed)) {
      backupCorruptedData(raw)
      return structuredClone(DEFAULT_CHECKLIST_DATA)
    }
    return mergeChecklistData(parsed)
  } catch (error) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) backupCorruptedData(raw)
    notifyStorageError(error, '读取数据失败，已重置为默认数据')
    return structuredClone(DEFAULT_CHECKLIST_DATA)
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function saveData(data: ChecklistData): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      notifyStorageError(error, '保存数据失败')
    }
    saveTimeout = null
  }, MS.STORAGE_DEBOUNCE)
}

export function saveDataImmediate(data: ChecklistData): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    notifyStorageError(error, '保存数据失败')
  }
}

export function resetItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) => ({ ...item, isCompleted: false }))
}
