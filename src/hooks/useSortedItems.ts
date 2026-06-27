import { useMemo } from 'react'
import type { ChecklistItem } from '../types'

export function useSortedItems(visibleItems: ChecklistItem[], isAutoMoveEnabled: boolean) {
  const sortedItems = useMemo(() => {
    return [...visibleItems].sort((firstItem, secondItem) => {
      if (isAutoMoveEnabled && firstItem.isCompleted !== secondItem.isCompleted)
        return firstItem.isCompleted ? 1 : -1
      return firstItem.order - secondItem.order
    })
  }, [visibleItems, isAutoMoveEnabled])

  const sortedItemIds = useMemo(() => sortedItems.map((item) => item.id), [sortedItems])

  return {
    sortedItems,
    sortedItemIds,
  }
}
