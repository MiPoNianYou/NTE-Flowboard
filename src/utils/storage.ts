import type { ChecklistData, ChecklistItem, ServerRegion, BehaviorSettings } from '../types'
import { MS } from './constants'
import {
  shouldResetDaily as _shouldResetDaily,
  shouldResetWeekly as _shouldResetWeekly,
  shouldResetMonthly as _shouldResetMonthly,
} from './timezone'
import { isChecklistData, isServerRegion } from './validation'
import { mergeChecklistData } from './dataMigration'

// --- 服务器区域预设 ---

export const SERVER_REGIONS: Record<
  ServerRegion,
  { label: string; description: string; abbreviation: string }
> = {
  asia: {
    label: '亚太服',
    description: 'UTC+8 (固定)',
    abbreviation: 'AP',
  },
  america: {
    label: '美服',
    description: 'UTC-5 (EST) / UTC-4 (EDT)',
    abbreviation: 'US',
  },
  europe: {
    label: '欧服',
    description: 'UTC+1 (CET) / UTC+2 (CEST)',
    abbreviation: 'EU',
  },
}

// --- 默认数据 ---

const defaultDailyItems: ChecklistItem[] = [
  { id: 'd1', text: '纳库佩达之池', isCompleted: false, isHidden: false, order: 1, tags: ['地图'] },
  { id: 'd2', text: '魔女之家占卜', isCompleted: false, isHidden: false, order: 2, tags: ['地图'] },
  { id: 'd3', text: '福荫树木祈愿', isCompleted: false, isHidden: false, order: 3, tags: ['地图'] },
  { id: 'd4', text: '领一咖舍收益', isCompleted: false, isHidden: false, order: 4, tags: ['大亨'] },
  { id: 'd5', text: '赠送角色礼物', isCompleted: false, isHidden: false, order: 5, tags: ['羁遇'] },
  { id: 'd6', text: '角色都市偕游', isCompleted: false, isHidden: false, order: 6, tags: ['羁遇'] },
  { id: 'd7', text: '消耗本性像素', isCompleted: false, isHidden: false, order: 7, tags: ['材料'] },
  { id: 'd8', text: '领取家具产出', isCompleted: false, isHidden: false, order: 8, tags: ['材料'] },
]

const defaultWeeklyItems: ChecklistItem[] = [
  { id: 'w1', text: '异象巡礼周本', isCompleted: false, isHidden: false, order: 1, tags: [] },
  { id: 'w2', text: '消耗都市活力', isCompleted: false, isHidden: false, order: 2, tags: [] },
  { id: 'w3', text: '玛门贪世宝库', isCompleted: false, isHidden: false, order: 3, tags: [] },
  { id: 'w4', text: '老旧邮箱送货', isCompleted: false, isHidden: false, order: 4, tags: [] },
  { id: 'w5', text: '惠比寿拍卖行', isCompleted: false, isHidden: false, order: 5, tags: [] },
  { id: 'w6', text: '通行证周任务', isCompleted: false, isHidden: false, order: 6, tags: [] },
]

const defaultMonthlyItems: ChecklistItem[] = [
  { id: 'm1', text: '集市迷迭兑换', isCompleted: false, isHidden: false, order: 1, tags: ['商城'] },
  { id: 'm2', text: '大亨猎人交易', isCompleted: false, isHidden: false, order: 2, tags: ['商城'] },
  { id: 'm3', text: '玩法异境回收', isCompleted: false, isHidden: false, order: 3, tags: ['商城'] },
]

const defaultData: ChecklistData = {
  daily: defaultDailyItems,
  weekly: defaultWeeklyItems,
  monthly: defaultMonthlyItems,
  settings: {
    serverRegion: 'asia',
    isAutoMoveEnabled: true,
    shouldConfirmDelete: true,
  },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
  lastMonthlyReset: new Date().toISOString(),
}

// --- 运行时验证 ---

// --- 一次性迁移 ---

/** 将旧数据结构字段名转换为新格式 */
function migrateDataStructure(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const data = raw as Record<string, unknown>

  // item 级别字段迁移
  for (const tab of ['daily', 'weekly', 'monthly', 'custom']) {
    const items = data[tab]
    if (!Array.isArray(items)) continue
    data[tab] = items.map((item: Record<string, unknown>) => {
      if (typeof item.completed === 'boolean') {
        item.isCompleted = item.completed
        delete item.completed
      }
      if (typeof item.hidden === 'boolean') {
        item.isHidden = item.hidden
        delete item.hidden
      }
      delete item.id
      delete item.isPreset
      return item
    })
  }

  // custom → monthly
  if ('custom' in data) {
    if (Array.isArray(data.custom) && data.custom.length > 0) {
      data.monthly = data.custom
    } else if (!Array.isArray(data.monthly)) {
      data.monthly = defaultMonthlyItems.map((item) => ({ ...item }))
    }
  }
  if (!Array.isArray(data.monthly)) {
    data.monthly = []
  }
  delete data.custom

  // resetConfig → settings
  const oldConfig = data.resetConfig as Record<string, unknown> | undefined
  if (oldConfig && typeof oldConfig === 'object') {
    const settings = (data.settings as Record<string, unknown>) ?? {}
    if (typeof oldConfig.serverRegion === 'string' && !settings.serverRegion) {
      settings.serverRegion = oldConfig.serverRegion
    }
    data.settings = settings
    delete data.resetConfig
  }

  // settings 内部字段迁移
  const settings = data.settings as Record<string, unknown> | undefined
  if (settings && typeof settings === 'object') {
    if (typeof settings.autoMoveCompleted === 'boolean' && !('isAutoMoveEnabled' in settings)) {
      settings.isAutoMoveEnabled = settings.autoMoveCompleted
    }
    delete settings.autoMoveCompleted
    if (typeof settings.confirmDelete === 'boolean' && !('shouldConfirmDelete' in settings)) {
      settings.shouldConfirmDelete = settings.confirmDelete
    }
    delete settings.confirmDelete
    delete settings.showCustomTab
  }

  // lastCustomReset → lastMonthlyReset
  if (typeof data.lastCustomReset === 'string' && !data.lastMonthlyReset) {
    data.lastMonthlyReset = data.lastCustomReset
  }
  delete data.lastCustomReset
  delete data.customResetMode

  return data
}

/** 一次性迁移旧 localStorage key → 新 key。幂等，可安全重复调用。 */
function migrateLegacyKeys(): void {
  // 1. 主数据：旧 key + 旧字段名 → 新 key + 新字段名
  const oldDataKey = 'nte-checklist-data'
  const rawData = localStorage.getItem(oldDataKey)
  if (rawData) {
    try {
      const parsed = JSON.parse(rawData)
      const migrated = migrateDataStructure(parsed)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    } catch {
      // 迁移失败，保留旧 key 不删除，下次再试
      console.warn('[Storage] 旧数据迁移失败，下次启动将重试')
      return
    }
    localStorage.removeItem(oldDataKey)
    localStorage.removeItem('nte-corrupted-backup')
  }

  // 2. 简单 key 搬家（值不变）
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
}

// --- localStorage ---

const STORAGE_KEY = 'flowboard-checklist'

const CORRUPTED_BACKUP_KEY = 'flowboard-corrupted-backup'

function backupCorruptedData(raw: string): void {
  try {
    localStorage.setItem(CORRUPTED_BACKUP_KEY, raw)
    notifyStorageError(new Error('数据格式异常，已备份原始数据'), '数据恢复')
  } catch {
    // 备份也失败的话就无能为力了
  }
}

export function loadData(): ChecklistData {
  try {
    migrateLegacyKeys()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(defaultData)
    const parsed: unknown = JSON.parse(raw)
    if (!isChecklistData(parsed)) {
      backupCorruptedData(raw)
      return structuredClone(defaultData)
    }
    return mergeChecklistData(parsed)
  } catch (error) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) backupCorruptedData(raw)
    notifyStorageError(error, '读取数据失败，已重置为默认数据')
    return structuredClone(defaultData)
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

// --- 错误通知 ---
type StorageErrorHandler = (error: Error, context: string) => void
let storageErrorHandler: StorageErrorHandler | null = null

export function setStorageErrorHandler(handler: StorageErrorHandler | null): void {
  storageErrorHandler = handler
}

function notifyStorageError(error: unknown, context: string): void {
  const errorInstance = error instanceof Error ? error : new Error(String(error))
  console.error(`[Storage] ${context}:`, errorInstance.message)
  storageErrorHandler?.(errorInstance, context)
}

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

/** 立即写入 localStorage，绕过防抖。用于 beforeunload 等必须同步完成的场景。 */
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

// --- Import / Export ---

export interface ImportResult {
  data: ChecklistData
  settings?: BehaviorSettings
}

/** 按统一字段顺序构建对象，确保导出与云同步排版一致 */
export function toOrderedData(
  data: ChecklistData,
  settings?: BehaviorSettings,
): Record<string, unknown> {
  return {
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
    ...(settings ? { settings } : {}),
    lastDailyReset: data.lastDailyReset,
    lastWeeklyReset: data.lastWeeklyReset,
    lastMonthlyReset: data.lastMonthlyReset,
  }
}

export function exportData(
  data: ChecklistData,
  includeSettings?: boolean,
  settings?: BehaviorSettings,
): string {
  return JSON.stringify(toOrderedData(data, includeSettings ? settings : undefined), null, 2)
}

export function importData(json: string): ImportResult | null {
  try {
    const parsed: unknown = JSON.parse(json)
    if (parsed === null || typeof parsed !== 'object') return null
    const migrated = migrateDataStructure(parsed)
    const parsedObject = migrated as Record<string, unknown>
    if (typeof parsedObject.lastDailyReset !== 'string')
      parsedObject.lastDailyReset = new Date().toISOString()
    if (typeof parsedObject.lastWeeklyReset !== 'string')
      parsedObject.lastWeeklyReset = new Date().toISOString()
    if (typeof parsedObject.lastMonthlyReset !== 'string')
      parsedObject.lastMonthlyReset = new Date().toISOString()
    if (!isChecklistData(parsedObject)) return null
    const data = mergeChecklistData(parsedObject)
    let settings: BehaviorSettings | undefined
    if (parsedObject.settings && typeof parsedObject.settings === 'object') {
      const settingsObject = parsedObject.settings as unknown as Record<string, unknown>
      const region =
        typeof settingsObject.serverRegion === 'string' &&
        isServerRegion(settingsObject.serverRegion)
          ? (settingsObject.serverRegion as ServerRegion)
          : 'asia'
      if (
        typeof settingsObject.isAutoMoveEnabled === 'boolean' &&
        typeof settingsObject.shouldConfirmDelete === 'boolean'
      ) {
        settings = {
          serverRegion: region,
          isAutoMoveEnabled: settingsObject.isAutoMoveEnabled,
          shouldConfirmDelete: settingsObject.shouldConfirmDelete,
        }
      } else {
        settings = {
          serverRegion: region,
          isAutoMoveEnabled: true,
          shouldConfirmDelete: true,
        }
      }
    }
    return { data, settings }
  } catch {
    return null
  }
}

// --- Reset ---

export function shouldResetDaily(data: ChecklistData): boolean {
  const region = data.settings?.serverRegion ?? 'asia'
  return _shouldResetDaily(data.lastDailyReset, region)
}

export function shouldResetWeekly(data: ChecklistData): boolean {
  const region = data.settings?.serverRegion ?? 'asia'
  return _shouldResetWeekly(data.lastWeeklyReset, region)
}

export function shouldResetMonthly(data: ChecklistData): boolean {
  const region = data.settings?.serverRegion ?? 'asia'
  return _shouldResetMonthly(data.lastMonthlyReset, region)
}

export function resetItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) => ({ ...item, isCompleted: false }))
}
