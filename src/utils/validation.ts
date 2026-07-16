import type { ChecklistData, ChecklistItem } from '../types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isChecklistItemArray(value: unknown): value is ChecklistItem[] {
  return (
    Array.isArray(value) &&
    value.every((item): item is ChecklistItem => {
      if (!isObject(item)) return false
      return (
        (item.id === undefined || typeof item.id === 'string') &&
        typeof item.text === 'string' &&
        typeof item.isCompleted === 'boolean' &&
        typeof item.isHidden === 'boolean' &&
        typeof item.order === 'number' &&
        (item.tags === undefined ||
          (Array.isArray(item.tags) &&
            (item.tags as unknown[]).every((tagElement) => typeof tagElement === 'string')))
      )
    })
  )
}

export function isChecklistData(value: unknown): value is ChecklistData {
  if (!isObject(value)) return false
  return (
    isChecklistItemArray(value.daily) &&
    isChecklistItemArray(value.weekly) &&
    isChecklistItemArray(value.monthly) &&
    typeof value.lastDailyReset === 'string' &&
    typeof value.lastWeeklyReset === 'string' &&
    typeof value.lastMonthlyReset === 'string'
  )
}
