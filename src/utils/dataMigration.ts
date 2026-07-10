import type { ChecklistData, ChecklistItem, BehaviorSettings, UiPreferences } from '../types'
import { DEFAULT_CHECKLIST_DATA } from './seed'
import { generateId } from './id'

const defaultData = DEFAULT_CHECKLIST_DATA

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

  const parsedUi = parsed.uiPreferences
  const uiPreferences: UiPreferences = {
    cloudPatchHidden:
      typeof parsedUi?.cloudPatchHidden === 'boolean'
        ? parsedUi.cloudPatchHidden
        : defaultData.uiPreferences.cloudPatchHidden,
  }

  return {
    daily,
    weekly,
    monthly,
    settings,
    uiPreferences,
    lastDailyReset: parsed.lastDailyReset ?? new Date().toISOString(),
    lastWeeklyReset: parsed.lastWeeklyReset ?? new Date().toISOString(),
    lastMonthlyReset: parsed.lastMonthlyReset ?? new Date().toISOString(),
  }
}
