import type { ChecklistData, BehaviorSettings, ServerRegion } from '../types'
import { migrateDataStructure, mergeChecklistData } from './dataMigration'
import { isChecklistData, isServerRegion } from './validation'

export interface ImportResult {
  data: ChecklistData
  settings?: BehaviorSettings
}

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
      const s = parsedObject.settings as unknown as Record<string, unknown>
      const region: ServerRegion =
        typeof s.serverRegion === 'string' && isServerRegion(s.serverRegion)
          ? (s.serverRegion as ServerRegion)
          : 'asia'
      settings = {
        serverRegion: region,
        isAutoMoveEnabled: typeof s.isAutoMoveEnabled === 'boolean' ? s.isAutoMoveEnabled : true,
        shouldConfirmDelete:
          typeof s.shouldConfirmDelete === 'boolean' ? s.shouldConfirmDelete : true,
      }
    }
    return { data, settings }
  } catch {
    return null
  }
}
