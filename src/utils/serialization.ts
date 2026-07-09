import type { ChecklistData } from '../types'
import { migrateDataStructure, mergeChecklistData } from './dataMigration'
import { isChecklistData } from './validation'

export interface ImportResult {
  data: ChecklistData
}

export function toOrderedData(data: ChecklistData): Record<string, unknown> {
  return {
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
    settings: data.settings,
    uiPreferences: data.uiPreferences,
    lastDailyReset: data.lastDailyReset,
    lastWeeklyReset: data.lastWeeklyReset,
    lastMonthlyReset: data.lastMonthlyReset,
  }
}

export function exportData(data: ChecklistData): string {
  return JSON.stringify(toOrderedData(data), null, 2)
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
    return { data }
  } catch {
    return null
  }
}
