import type { ChecklistCycle, ChecklistData, ChecklistItem, ChecklistTransition } from '../types'
import { getResetSchedule, isResetDue } from './resetCalendar'
import { resetItems } from './storage'

const CYCLES: ChecklistCycle[] = ['daily', 'weekly', 'monthly']

const RESET_TIMESTAMP_KEYS = {
  daily: 'lastDailyReset',
  weekly: 'lastWeeklyReset',
  monthly: 'lastMonthlyReset',
} as const

export function applyChecklistTransition(
  data: ChecklistData,
  transition: ChecklistTransition,
): ChecklistData {
  switch (transition.kind) {
    case 'add-item':
      return addItem(data, transition.cycle, transition.item)
    case 'toggle-item':
      return updateItem(data, transition.cycle, transition.id, (item) => ({
        ...item,
        isCompleted: !item.isCompleted,
      }))
    case 'edit-item':
      return updateItem(data, transition.cycle, transition.id, (item) => {
        if (item.text === transition.text && sameTags(item.tags, transition.tags)) return item
        return { ...item, text: transition.text, tags: transition.tags }
      })
    case 'remove-item':
      return removeItem(data, transition.cycle, transition.id)
    case 'set-item-hidden':
      return updateItem(data, transition.cycle, transition.id, (item) => {
        if (item.isHidden === transition.isHidden) return item
        return { ...item, isHidden: transition.isHidden }
      })
    case 'reorder-item':
      return reorderItems(data, transition.cycle, transition.activeId, transition.overId)
    case 'manual-reset':
      return resetCycle(data, transition.cycle, transition.now)
    case 'apply-due-resets':
      return applyDueResets(data, transition.now)
    case 'replace-data':
      return transition.data === data ? data : transition.data
    case 'update-settings':
      return updateSettings(data, transition.partial)
    case 'update-ui-preferences':
      return updateUiPreferences(data, transition.partial)
  }
}

function addItem(data: ChecklistData, cycle: ChecklistCycle, item: ChecklistItem): ChecklistData {
  const items = data[cycle]
  const nextOrder = items.reduce((maximum, current) => Math.max(maximum, current.order), 0) + 1
  const nextItem = { ...item, order: nextOrder }

  return { ...data, [cycle]: [...items, nextItem] }
}

function updateItem(
  data: ChecklistData,
  cycle: ChecklistCycle,
  id: string,
  update: (item: ChecklistItem) => ChecklistItem,
): ChecklistData {
  const items = data[cycle]
  const itemIndex = items.findIndex((item) => item.id === id)
  if (itemIndex === -1) return data

  const updatedItem = update(items[itemIndex])
  if (updatedItem === items[itemIndex]) return data

  const nextItems = [...items]
  nextItems[itemIndex] = updatedItem
  return { ...data, [cycle]: nextItems }
}

function removeItem(data: ChecklistData, cycle: ChecklistCycle, id: string): ChecklistData {
  const items = data[cycle]
  const nextItems = items.filter((item) => item.id !== id)
  return nextItems.length === items.length ? data : { ...data, [cycle]: nextItems }
}

function reorderItems(
  data: ChecklistData,
  cycle: ChecklistCycle,
  activeId: string,
  overId: string,
): ChecklistData {
  const items = [...data[cycle]].sort((left, right) => left.order - right.order)
  const oldIndex = items.findIndex((item) => item.id === activeId)
  const newIndex = items.findIndex((item) => item.id === overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return data

  const [movedItem] = items.splice(oldIndex, 1)
  items.splice(newIndex, 0, movedItem)
  return {
    ...data,
    [cycle]: items.map((item, index) => ({ ...item, order: index + 1 })),
  }
}

function resetCycle(data: ChecklistData, cycle: ChecklistCycle, now: Date): ChecklistData {
  const timestampKey = RESET_TIMESTAMP_KEYS[cycle]
  const nextTimestamp = now.toISOString()
  const items = data[cycle]
  const nextItems = resetItems(items)
  const itemsChanged = nextItems.some((item, index) => item !== items[index])
  if (!itemsChanged && data[timestampKey] === nextTimestamp) return data

  return { ...data, [cycle]: nextItems, [timestampKey]: nextTimestamp }
}

function applyDueResets(data: ChecklistData, now: Date): ChecklistData {
  let next = data

  for (const cycle of CYCLES) {
    const timestampKey = RESET_TIMESTAMP_KEYS[cycle]
    const schedule = getResetSchedule(cycle, next.settings.serverRegion, now)
    if (!isResetDue(next[timestampKey], schedule)) continue
    next = resetCycle(next, cycle, now)
  }

  return next
}

function updateSettings(
  data: ChecklistData,
  partial: Partial<ChecklistData['settings']>,
): ChecklistData {
  if (!hasChanges(data.settings, partial)) return data
  return { ...data, settings: { ...data.settings, ...partial } }
}

function updateUiPreferences(
  data: ChecklistData,
  partial: Partial<ChecklistData['uiPreferences']>,
): ChecklistData {
  if (!hasChanges(data.uiPreferences, partial)) return data
  return { ...data, uiPreferences: { ...data.uiPreferences, ...partial } }
}

function hasChanges<Value extends object>(current: Value, partial: Partial<Value>): boolean {
  return (Object.keys(partial) as (keyof Value)[]).some(
    (property) => current[property] !== partial[property],
  )
}

function sameTags(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((tag, index) => tag === right[index])
}
