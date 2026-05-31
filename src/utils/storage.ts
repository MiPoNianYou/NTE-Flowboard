import type { ChecklistData, ChecklistItem, ResetConfig, ServerRegion } from '../types'

// --- Server region presets ---

export const SERVER_REGIONS: Record<ServerRegion, { label: string; description: string }> = {
  asia: {
    label: '亚太服',
    description: 'UTC+8 (固定)',
  },
  america: {
    label: '美服',
    description: 'UTC-5 (EST) / UTC-4 (EDT)',
  },
  europe: {
    label: '欧服',
    description: 'UTC+1 (CET) / UTC+2 (CEST)',
  },
}

/**
 * Check if a given date falls within US DST period.
 * DST starts 2nd Sunday of March at 2:00 AM
 * DST ends 1st Sunday of November at 2:00 AM
 */
function isUSDST(date: Date): boolean {
  const year = date.getFullYear()

  // DST starts: 2nd Sunday of March
  const march1 = new Date(year, 2, 1)
  const marchFirstSunday = march1.getDay() === 0 ? 1 : 7 - march1.getDay() + 1
  const dstStart = new Date(year, 2, marchFirstSunday + 7, 2, 0, 0)

  // DST ends: 1st Sunday of November
  const nov1 = new Date(year, 10, 1)
  const novFirstSunday = nov1.getDay() === 0 ? 1 : 7 - nov1.getDay() + 1
  const dstEnd = new Date(year, 10, novFirstSunday, 2, 0, 0)

  return date >= dstStart && date < dstEnd
}

/**
 * Check if a given date falls within EU DST period.
 * DST starts last Sunday of March at 1:00 AM UTC
 * DST ends last Sunday of October at 1:00 AM UTC
 */
function isEUDST(date: Date): boolean {
  const year = date.getFullYear()

  // DST starts: last Sunday of March
  const march31 = new Date(year, 2, 31)
  const marchLastSunday = 31 - ((march31.getDay() + 6) % 7)
  const dstStart = new Date(Date.UTC(year, 2, marchLastSunday, 1, 0, 0))

  // DST ends: last Sunday of October
  const oct31 = new Date(year, 9, 31)
  const octLastSunday = 31 - ((oct31.getDay() + 6) % 7)
  const dstEnd = new Date(Date.UTC(year, 9, octLastSunday, 1, 0, 0))

  const nowUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
  return nowUTC >= dstStart.getTime() && nowUTC < dstEnd.getTime()
}

/**
 * Get the current UTC offset for a server region.
 * @param region - Server region
 * @param date - Date to check (defaults to now)
 * @returns UTC offset in hours
 */
function getServerUTCOffset(region: ServerRegion, date: Date = new Date()): number {
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

function isChecklistItemArray(val: unknown): val is ChecklistItem[] {
  return (
    Array.isArray(val) &&
    val.every(
      (item): item is ChecklistItem =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).text === 'string' &&
        typeof (item as Record<string, unknown>).completed === 'boolean' &&
        typeof (item as Record<string, unknown>).hidden === 'boolean' &&
        typeof (item as Record<string, unknown>).order === 'number' &&
        Array.isArray((item as Record<string, unknown>).tags) &&
        ((item as Record<string, unknown>).tags as unknown[]).every((t) => typeof t === 'string'),
    )
  )
}

function isServerRegion(val: unknown): val is ServerRegion {
  return val === 'asia' || val === 'america' || val === 'europe'
}

function isResetConfig(val: unknown): val is ResetConfig {
  if (val === null || typeof val !== 'object') return false
  const rc = val as Record<string, unknown>
  // Support legacy format (has dailyResetHour) or new format (has serverRegion)
  if (rc.serverRegion !== undefined) {
    return isServerRegion(rc.serverRegion)
  }
  // Legacy: convert old format to new
  return typeof rc.dailyResetHour === 'number'
}

export function isChecklistData(val: unknown): val is ChecklistData {
  if (val === null || typeof val !== 'object') return false
  const d = val as Record<string, unknown>
  return (
    isChecklistItemArray(d.daily) &&
    isChecklistItemArray(d.weekly) &&
    isResetConfig(d.resetConfig) &&
    typeof d.lastDailyReset === 'string' &&
    typeof d.lastWeeklyReset === 'string'
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
  resetConfig: {
    serverRegion: 'asia',
  },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
}

/** 兼容旧数据：允许可选的 id / isPreset 字段 */
type OldChecklistItem = ChecklistItem & { id?: unknown; isPreset?: unknown }

/** 按当前顺序将 order 重编为从 1 开始的连续整数，去掉旧 id 字段（兼容旧数据） */
function normalizeOrders(items: ChecklistItem[]): ChecklistItem[] {
  return items
    .sort((a, b) => a.order - b.order)
    .map((item, index) => {
      const { id: _id, isPreset: _isPreset, ...rest } = item as OldChecklistItem
      return { ...rest, hidden: rest.hidden ?? false, order: index + 1 }
    })
}

function mergeResetConfig(parsed: ChecklistData): ResetConfig {
  const rc = parsed.resetConfig
  // Support legacy format: convert to new serverRegion format
  if (rc && typeof rc === 'object' && 'serverRegion' in rc && isServerRegion(rc.serverRegion)) {
    return { serverRegion: rc.serverRegion }
  }
  // Legacy format: default to asia
  return { serverRegion: defaultData.resetConfig.serverRegion }
}

/** 合并 parsed 数据，缺失字段用 defaultData 补齐 */
function mergeChecklistData(parsed: ChecklistData): ChecklistData {
  const daily = normalizeOrders(parsed.daily)
  const weekly = normalizeOrders(parsed.weekly ?? defaultData.weekly)
  return {
    daily,
    weekly,
    resetConfig: mergeResetConfig(parsed),
    lastDailyReset: parsed.lastDailyReset ?? new Date().toISOString(),
    lastWeeklyReset: parsed.lastWeeklyReset ?? new Date().toISOString(),
  }
}

export function loadData(): ChecklistData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(defaultData)
    const parsed: unknown = JSON.parse(raw)
    if (!isChecklistData(parsed)) {
      console.warn('[Storage] Invalid data format in localStorage, using defaults')
      return structuredClone(defaultData)
    }
    return mergeChecklistData(parsed)
  } catch {
    return structuredClone(defaultData)
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function saveData(data: ChecklistData): void {
  // 防抖：300ms 内多次调用只执行最后一次
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // localStorage 已满或隐私模式不支持，静默失败
    }
    saveTimeout = null
  }, 300)
}

/** 立即写入 localStorage，绕过防抖。用于 beforeunload 等必须同步完成的场景。 */
export function saveDataImmediate(data: ChecklistData): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // silent
  }
}

export function exportData(data: ChecklistData): string {
  return JSON.stringify(
    {
      daily: data.daily,
      weekly: data.weekly,
      resetConfig: data.resetConfig,
    },
    null,
    2,
  )
}

export function importData(json: string): ChecklistData | null {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!isChecklistData(parsed)) {
      return null
    }
    const daily = normalizeOrders(parsed.daily)
    const weekly = normalizeOrders(parsed.weekly ?? defaultData.weekly)
    return {
      daily,
      weekly,
      resetConfig: mergeResetConfig(parsed),
      lastDailyReset: parsed.lastDailyReset,
      lastWeeklyReset: parsed.lastWeeklyReset,
    }
  } catch {
    return null
  }
}

/**
 * Check if daily reset should occur.
 * Reset time is always 5:00 AM in the server's timezone.
 */
export function shouldResetDaily(data: ChecklistData): boolean {
  const region = data.resetConfig.serverRegion ?? 'asia'
  const now = getServerDate(region)
  const last = new Date(data.lastDailyReset)
  const resetHour = 5 // Always 5:00 AM

  // Get today's reset time in the server timezone
  const todayReset = new Date(now)
  todayReset.setHours(resetHour, 0, 0, 0)

  // If current time is before reset hour, the relevant reset time is yesterday's
  if (now < todayReset) {
    todayReset.setDate(todayReset.getDate() - 1)
  }

  // Convert todayReset back to UTC for comparison with lastReset
  const offset = getServerUTCOffset(region)
  const todayResetUTC = new Date(todayReset.getTime() - (offset * 3600000 + now.getTimezoneOffset() * 60000))

  return last < todayResetUTC
}

/**
 * Check if weekly reset should occur.
 * Reset time is always Monday 5:00 AM in the server's timezone.
 */
export function shouldResetWeekly(data: ChecklistData): boolean {
  const region = data.resetConfig.serverRegion ?? 'asia'
  const now = getServerDate(region)
  const last = new Date(data.lastWeeklyReset)
  const resetDay = 1 // Monday
  const resetHour = 5 // Always 5:00 AM

  // Find the most recent reset day+hour in the server timezone
  const thisWeekReset = new Date(now)
  const currentDay = now.getDay()
  let dayDiff = currentDay - resetDay
  if (dayDiff < 0) dayDiff += 7
  thisWeekReset.setDate(now.getDate() - dayDiff)
  thisWeekReset.setHours(resetHour, 0, 0, 0)

  // If we haven't reached this week's reset yet, go back a week
  if (now < thisWeekReset) {
    thisWeekReset.setDate(thisWeekReset.getDate() - 7)
  }

  // Convert thisWeekReset back to UTC for comparison with lastReset
  const offset = getServerUTCOffset(region)
  const thisWeekResetUTC = new Date(thisWeekReset.getTime() - (offset * 3600000 + now.getTimezoneOffset() * 60000))

  return last < thisWeekResetUTC
}

export function resetItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) => ({ ...item, completed: false }))
}
