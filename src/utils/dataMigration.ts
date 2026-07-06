import type { ChecklistData, ChecklistItem, BehaviorSettings } from '../types'
import { DEFAULT_CHECKLIST_DATA } from './seed'

const defaultData = DEFAULT_CHECKLIST_DATA

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

/** 按当前顺序将 order 重编为从 1 开始的连续整数，去掉残留的旧字段 */
function normalizeOrders(items: ChecklistItem[]): ChecklistItem[] {
  return items
    .sort((leftItem, rightItem) => leftItem.order - rightItem.order)
    .map((item, index) => {
      const { isPreset: _isPreset, ...rest } = item as ChecklistItem & {
        isPreset?: unknown
      }
      return {
        ...rest,
        id: typeof rest.id === 'string' && rest.id.length > 0 ? rest.id : generateId(),
        isHidden: rest.isHidden ?? false,
        tags: rest.tags ?? [],
        order: index + 1,
      }
    })
}

/** 将旧数据结构字段名转换为新格式（storage load 与 import 共用） */
export function migrateDataStructure(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const data = raw as Record<string, unknown>

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

  if ('custom' in data) {
    if (Array.isArray(data.custom) && data.custom.length > 0) {
      data.monthly = data.custom
    } else if (!Array.isArray(data.monthly)) {
      data.monthly = defaultData.monthly.map((item) => ({ ...item }))
    }
  }
  if (!Array.isArray(data.monthly)) data.monthly = []
  delete data.custom

  const oldConfig = data.resetConfig as Record<string, unknown> | undefined
  if (oldConfig && typeof oldConfig === 'object') {
    const settings = (data.settings as Record<string, unknown>) ?? {}
    if (typeof oldConfig.serverRegion === 'string' && !settings.serverRegion) {
      settings.serverRegion = oldConfig.serverRegion
    }
    data.settings = settings
    delete data.resetConfig
  }

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

  if (typeof data.lastCustomReset === 'string' && !data.lastMonthlyReset) {
    data.lastMonthlyReset = data.lastCustomReset
  }
  delete data.lastCustomReset
  delete data.customResetMode

  return data
}

/** 合并 parsed 数据，缺失字段用 defaultData 补齐 */
export function mergeChecklistData(parsed: ChecklistData): ChecklistData {
  const daily = normalizeOrders(parsed.daily)
  const weekly = normalizeOrders(parsed.weekly ?? defaultData.weekly)
  const monthly = normalizeOrders(parsed.monthly ?? defaultData.monthly)

  const parsedSettings = parsed.settings
  const settings: BehaviorSettings = {
    serverRegion: parsedSettings?.serverRegion ?? defaultData.settings.serverRegion,
    isAutoMoveEnabled: parsedSettings?.isAutoMoveEnabled ?? defaultData.settings.isAutoMoveEnabled,
    shouldConfirmDelete:
      parsedSettings?.shouldConfirmDelete ?? defaultData.settings.shouldConfirmDelete,
  }

  return {
    daily,
    weekly,
    monthly,
    settings,
    lastDailyReset: parsed.lastDailyReset ?? new Date().toISOString(),
    lastWeeklyReset: parsed.lastWeeklyReset ?? new Date().toISOString(),
    lastMonthlyReset: parsed.lastMonthlyReset ?? new Date().toISOString(),
  }
}
