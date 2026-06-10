import type { ChecklistData, ChecklistItem, ResetConfig, ServerRegion, BehaviorSettings } from '../types'
import { MS } from './constants'

// --- Server region presets ---

export const SERVER_REGIONS: Record<ServerRegion, { label: string; description: string; abbr: string }> = {
  asia: {
    label: '亚太服',
    description: 'UTC+8 (固定)',
    abbr: 'AP',
  },
  america: {
    label: '美服',
    description: 'UTC-5 (EST) / UTC-4 (EDT)',
    abbr: 'US',
  },
  europe: {
    label: '欧服',
    description: 'UTC+1 (CET) / UTC+2 (CEST)',
    abbr: 'EU',
  },
}

/**
 * 检查给定日期是否在美国夏令时期间。
 * 夏令时开始：3 月第二个周日 2:00 AM
 * 夏令时结束：11 月第一个周日 2:00 AM
 */
export function isUSDST(date: Date): boolean {
  const year = date.getFullYear()

  // 夏令时开始：3 月第二个周日
  const march1 = new Date(year, 2, 1)
  const marchFirstSunday = march1.getDay() === 0 ? 1 : 7 - march1.getDay() + 1
  const dstStart = new Date(year, 2, marchFirstSunday + 7, 2, 0, 0)

  // 夏令时结束：11 月第一个周日
  const nov1 = new Date(year, 10, 1)
  const novFirstSunday = nov1.getDay() === 0 ? 1 : 7 - nov1.getDay() + 1
  const dstEnd = new Date(year, 10, novFirstSunday, 2, 0, 0)

  return date >= dstStart && date < dstEnd
}

/**
 * 检查给定日期是否在欧洲夏令时期间。
 * 夏令时开始：3 月最后一个周日 1:00 AM UTC
 * 夏令时结束：10 月最后一个周日 1:00 AM UTC
 */
export function isEUDST(date: Date): boolean {
  const year = date.getFullYear()

  // 夏令时开始：3 月最后一个周日
  const march31 = new Date(year, 2, 31)
  const marchLastSunday = 31 - march31.getDay()
  const dstStart = new Date(Date.UTC(year, 2, marchLastSunday, 1, 0, 0))

  // 夏令时结束：10 月最后一个周日
  const oct31 = new Date(year, 9, 31)
  const octLastSunday = 31 - oct31.getDay()
  const dstEnd = new Date(Date.UTC(year, 9, octLastSunday, 1, 0, 0))

  const nowUTC = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  )
  return nowUTC >= dstStart.getTime() && nowUTC < dstEnd.getTime()
}

/**
 * 获取服务器区域的当前 UTC 偏移量。
 * @param region - 服务器区域
 * @param date - 要检查的日期（默认为当前时间）
 * @returns UTC 偏移量（小时）
 */
export function getServerUTCOffset(region: ServerRegion, date: Date = new Date()): number {
  switch (region) {
    case 'asia':
      return 8 // Fixed UTC+8
    case 'america':
      return isUSDST(date) ? -4 : -5 // EDT : EST
    case 'europe':
      return isEUDST(date) ? 2 : 1 // CEST : CET
  }
}

/**
 * Get the current date/time adjusted for a server region's timezone.
 */
export function getServerDate(region: ServerRegion): Date {
  const offset = getServerUTCOffset(region)
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + offset * 3600000)
}

// --- Runtime validation ---

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

function isChecklistItemArray(val: unknown): val is ChecklistItem[] {
  return (
    Array.isArray(val) &&
    val.every(
      (item): item is ChecklistItem => {
        if (!isObject(item)) return false
        return (
          typeof item.text === 'string' &&
          typeof item.completed === 'boolean' &&
          typeof item.hidden === 'boolean' &&
          typeof item.order === 'number' &&
          // tags 允许缺失（旧数据兼容），存在时必须是 string[]
          (item.tags === undefined ||
            (Array.isArray(item.tags) && (item.tags as unknown[]).every((t) => typeof t === 'string')))
        )
      },
    )
  )
}

function isServerRegion(val: unknown): val is ServerRegion {
  return val === 'asia' || val === 'america' || val === 'europe'
}

function isResetConfig(val: unknown): val is ResetConfig {
  if (!isObject(val)) return false
  // 兼容旧格式（dailyResetHour）和新格式（serverRegion）
  if (val.serverRegion !== undefined) {
    return isServerRegion(val.serverRegion)
  }
  // 旧格式：转换为新格式
  return typeof val.dailyResetHour === 'number'
}

export function isChecklistData(val: unknown): val is ChecklistData {
  if (!isObject(val)) return false
  return (
    isChecklistItemArray(val.daily) &&
    isChecklistItemArray(val.weekly) &&
    (!('custom' in val) || isChecklistItemArray(val.custom)) &&
    isResetConfig(val.resetConfig) &&
    typeof val.lastDailyReset === 'string' &&
    typeof val.lastWeeklyReset === 'string'
  )
}

const STORAGE_KEY = 'nte-checklist-data'

const defaultDailyItems: ChecklistItem[] = [
  { text: '纳库佩达之池', completed: false, hidden: false, order: 1, tags: ['地图'] },
  { text: '魔女之家占卜', completed: false, hidden: false, order: 2, tags: ['地图'] },
  { text: '福荫树木祈愿', completed: false, hidden: false, order: 3, tags: ['地图'] },
  { text: '领一咖舍收益', completed: false, hidden: false, order: 4, tags: ['大亨'] },
  { text: '赠送角色礼物', completed: false, hidden: false, order: 5, tags: ['羁遇'] },
  { text: '角色都市偕游', completed: false, hidden: false, order: 6, tags: ['羁遇'] },
  { text: '消耗本性像素', completed: false, hidden: false, order: 7, tags: ['材料'] },
  { text: '领取家具产出', completed: false, hidden: false, order: 8, tags: ['材料'] },
]

const defaultWeeklyItems: ChecklistItem[] = [
  { text: '异象巡礼周本', completed: false, hidden: false, order: 1, tags: [] },
  { text: '消耗都市活力', completed: false, hidden: false, order: 2, tags: [] },
  { text: '玛门贪世宝库', completed: false, hidden: false, order: 3, tags: [] },
  { text: '老旧邮箱送货', completed: false, hidden: false, order: 4, tags: [] },
  { text: '惠比寿拍卖行', completed: false, hidden: false, order: 5, tags: [] },
  { text: '通行证周任务', completed: false, hidden: false, order: 6, tags: [] },
]

const defaultData: ChecklistData = {
  daily: defaultDailyItems,
  weekly: defaultWeeklyItems,
  custom: [],
  resetConfig: {
    serverRegion: 'asia',
  },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
  customResetMode: 'daily',
}

/** 兼容旧数据：允许可选的 id / isPreset 字段 */
type OldChecklistItem = ChecklistItem & { id?: unknown; isPreset?: unknown }

/** 按当前顺序将 order 重编为从 1 开始的连续整数，去掉旧 id 字段（兼容旧数据） */
function normalizeOrders(items: ChecklistItem[]): ChecklistItem[] {
  return items
    .sort((a, b) => a.order - b.order)
    .map((item, index) => {
      const { id: _id, isPreset: _isPreset, ...rest } = item as OldChecklistItem
      return { ...rest, hidden: rest.hidden ?? false, tags: rest.tags ?? [], order: index + 1 }
    })
}

function mergeResetConfig(parsed: ChecklistData): ResetConfig {
  const rc = parsed.resetConfig
  // 兼容旧格式：转换为新 serverRegion 格式
  if (rc && typeof rc === 'object' && 'serverRegion' in rc && isServerRegion(rc.serverRegion)) {
    return { serverRegion: rc.serverRegion }
  }
  // 旧格式：默认使用亚服
  return { serverRegion: defaultData.resetConfig.serverRegion }
}

/** 合并 parsed 数据，缺失字段用 defaultData 补齐 */
export function mergeChecklistData(parsed: ChecklistData): ChecklistData {
  const daily = normalizeOrders(parsed.daily)
  const weekly = normalizeOrders(parsed.weekly ?? defaultData.weekly)
  const custom = normalizeOrders(parsed.custom ?? [])
  return {
    daily,
    weekly,
    custom,
    resetConfig: mergeResetConfig(parsed),
    lastDailyReset: parsed.lastDailyReset ?? new Date().toISOString(),
    lastWeeklyReset: parsed.lastWeeklyReset ?? new Date().toISOString(),
    lastCustomReset: parsed.lastCustomReset,
    customResetMode: (parsed.customResetMode as string) === 'custom' || (parsed.customResetMode as string) === 'none' ? 'daily' : (parsed.customResetMode ?? 'daily'),
    customName: parsed.customName,
  }
}

const CORRUPTED_BACKUP_KEY = 'nte-corrupted-backup'

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
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(defaultData)
    const parsed: unknown = JSON.parse(raw)
    if (!isChecklistData(parsed)) {
      backupCorruptedData(raw)
      return structuredClone(defaultData)
    }
    return mergeChecklistData(parsed)
  } catch (e) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) backupCorruptedData(raw)
    notifyStorageError(e, '读取数据失败，已重置为默认数据')
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
  const err = error instanceof Error ? error : new Error(String(error))
  console.error(`[Storage] ${context}:`, err.message)
  storageErrorHandler?.(err, context)
}

export function saveData(data: ChecklistData): void {
  // 防抖：300ms 内多次调用只执行最后一次
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      notifyStorageError(e, '保存数据失败')
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
  } catch (e) {
    notifyStorageError(e, '保存数据失败')
  }
}

export interface ImportResult {
  data: ChecklistData
  settings?: BehaviorSettings
}

/** 按统一字段顺序构建对象，确保导出与云同步排版一致 */
export function toOrderedData(data: ChecklistData, settings?: BehaviorSettings): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    daily: data.daily,
    weekly: data.weekly,
    custom: data.custom,
    resetConfig: data.resetConfig,
    lastDailyReset: data.lastDailyReset,
    lastWeeklyReset: data.lastWeeklyReset,
    lastCustomReset: data.lastCustomReset,
    customResetMode: data.customResetMode,
    customName: data.customName,
  }
  if (settings) {
    obj.settings = settings
  }
  return obj
}

export function exportData(data: ChecklistData, includeSettings?: boolean, settings?: BehaviorSettings): string {
  return JSON.stringify(toOrderedData(data, includeSettings ? settings : undefined), null, 2)
}

export function importData(json: string): ImportResult | null {
  try {
    const parsed: unknown = JSON.parse(json)
    if (parsed === null || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>
    // 补齐缺失字段，兼容旧版导出文件
    if (typeof obj.lastDailyReset !== 'string') obj.lastDailyReset = new Date().toISOString()
    if (typeof obj.lastWeeklyReset !== 'string') obj.lastWeeklyReset = new Date().toISOString()
    if (!('custom' in obj)) obj.custom = []
    if (!isChecklistData(obj)) return null
    const data = mergeChecklistData(obj)
    // 提取行为设置（如果存在）
    let settings: BehaviorSettings | undefined
    if (obj.settings && typeof obj.settings === 'object') {
      const s = obj.settings as unknown as Record<string, unknown>
      if (typeof s.autoMoveCompleted === 'boolean' && typeof s.confirmDelete === 'boolean') {
        settings = {
          autoMoveCompleted: s.autoMoveCompleted,
          confirmDelete: s.confirmDelete,
          showCustomTab: typeof s.showCustomTab === 'boolean' ? s.showCustomTab : true,
        }
      }
    }
    return { data, settings }
  } catch {
    return null
  }
}

/**
 * 检查是否应触发每日重置。
 * 重置时间固定为服务器时区的 5:00 AM。
 */
export function shouldResetDaily(data: ChecklistData): boolean {
  const region = data.resetConfig.serverRegion ?? 'asia'
  const now = getServerDate(region)
  const last = new Date(data.lastDailyReset)
  const resetHour = 5 // 固定 5:00 AM

  // 获取服务器时区中今天的重置时间
  const todayReset = new Date(now)
  todayReset.setHours(resetHour, 0, 0, 0)

  // 如果当前时间早于重置时间，相关重置时间是昨天的
  if (now < todayReset) {
    todayReset.setDate(todayReset.getDate() - 1)
  }

  // 将 todayReset 转回 UTC 以便与 lastReset 比较
  const offset = getServerUTCOffset(region)
  const todayResetUTC = new Date(
    todayReset.getTime() - (offset * 3600000 + now.getTimezoneOffset() * 60000),
  )

  return last < todayResetUTC
}

/**
 * 检查是否应触发每周重置。
 * 重置时间固定为服务器时区的周一 5:00 AM。
 */
export function shouldResetWeekly(data: ChecklistData): boolean {
  const region = data.resetConfig.serverRegion ?? 'asia'
  const now = getServerDate(region)
  const last = new Date(data.lastWeeklyReset)
  const resetDay = 1 // 周一
  const resetHour = 5 // 固定 5:00 AM

  // 找到服务器时区中最近的重置日+时间
  const thisWeekReset = new Date(now)
  const currentDay = now.getDay()
  let dayDiff = currentDay - resetDay
  if (dayDiff < 0) dayDiff += 7
  thisWeekReset.setDate(now.getDate() - dayDiff)
  thisWeekReset.setHours(resetHour, 0, 0, 0)

  // 如果还没到本周重置时间，回退一周
  if (now < thisWeekReset) {
    thisWeekReset.setDate(thisWeekReset.getDate() - 7)
  }

  // 将 thisWeekReset 转回 UTC 以便与 lastReset 比较
  const offset = getServerUTCOffset(region)
  const thisWeekResetUTC = new Date(
    thisWeekReset.getTime() - (offset * 3600000 + now.getTimezoneOffset() * 60000),
  )

  return last < thisWeekResetUTC
}

/**
 * 检查是否应触发自定义清单重置。
 * 根据 customResetMode 决定使用每日、每周或自定逻辑。
 */
export function shouldResetCustom(data: ChecklistData): boolean {
  if (data.customResetMode === 'daily') return shouldResetDaily({ ...data, lastDailyReset: data.lastCustomReset ?? data.lastDailyReset })
  if (data.customResetMode === 'weekly') return shouldResetWeekly({ ...data, lastWeeklyReset: data.lastCustomReset ?? data.lastWeeklyReset })
  return false
}

export function resetItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) => ({ ...item, completed: false }))
}
