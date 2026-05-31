import { useMemo } from 'react'
import type { ChecklistItem } from '../types'

export function useSortedItems(visibleItems: ChecklistItem[], autoMoveCompleted: boolean) {
  const sortedItems = useMemo(() => {
    return [...visibleItems].sort((a, b) => {
      if (autoMoveCompleted && a.completed !== b.completed) return a.completed ? 1 : -1
      return a.order - b.order
    })
  }, [visibleItems, autoMoveCompleted])

  const sortedItemIds = useMemo(() => sortedItems.map((i) => i.order), [sortedItems])

  return {
    sortedItems,
    sortedItemIds,
  }
}
