import type { ChecklistData, ChecklistItem, BehaviorSettings } from '../types'

const defaultData: ChecklistData = {
  daily: [],
  weekly: [],
  monthly: [],
  settings: {
    serverRegion: 'asia',
    isAutoMoveEnabled: true,
    shouldConfirmDelete: true,
  },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
  lastMonthlyReset: new Date().toISOString(),
}

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
