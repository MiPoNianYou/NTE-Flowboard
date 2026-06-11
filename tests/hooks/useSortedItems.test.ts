import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useSortedItems } from '../../src/hooks/useSortedItems'
import type { ChecklistItem } from '../../src/types'

const items: ChecklistItem[] = [
  { text: 'A', completed: false, hidden: false, order: 1, tags: [] },
  { text: 'B', completed: true, hidden: false, order: 2, tags: [] },
  { text: 'C', completed: false, hidden: false, order: 3, tags: [] },
  { text: 'D', completed: true, hidden: false, order: 4, tags: [] },
]

describe('useSortedItems', () => {
  it('should preserve order when autoMoveCompleted is false', () => {
    const { result } = renderHook(() => useSortedItems(items, false))
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('should move completed items to bottom when autoMoveCompleted is true', () => {
    const { result } = renderHook(() => useSortedItems(items, true))
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'C', 'B', 'D'])
  })

  it('should maintain order among uncompleted items', () => {
    const { result } = renderHook(() => useSortedItems(items, true))
    const uncompleted = result.current.sortedItems.filter(i => !i.completed)
    expect(uncompleted.map(i => i.order)).toEqual([1, 3])
  })

  it('should maintain order among completed items', () => {
    const { result } = renderHook(() => useSortedItems(items, true))
    const completed = result.current.sortedItems.filter(i => i.completed)
    expect(completed.map(i => i.order)).toEqual([2, 4])
  })

  it('should return sortedItemIds matching sortedItems orders', () => {
    const { result } = renderHook(() => useSortedItems(items, true))
    expect(result.current.sortedItemIds).toEqual(
      result.current.sortedItems.map(i => i.order),
    )
  })

  it('should handle empty items array', () => {
    const { result } = renderHook(() => useSortedItems([], true))
    expect(result.current.sortedItems).toEqual([])
    expect(result.current.sortedItemIds).toEqual([])
  })

  it('should handle all completed items', () => {
    const allCompleted = items.map(i => ({ ...i, completed: true }))
    const { result } = renderHook(() => useSortedItems(allCompleted, true))
    expect(result.current.sortedItems).toHaveLength(4)
    // All are completed, so order is preserved
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('should handle all uncompleted items', () => {
    const allUncompleted = items.map(i => ({ ...i, completed: false }))
    const { result } = renderHook(() => useSortedItems(allUncompleted, true))
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('should handle single item', () => {
    const single = [items[0]]
    const { result } = renderHook(() => useSortedItems(single, true))
    expect(result.current.sortedItems).toHaveLength(1)
    expect(result.current.sortedItems[0].text).toBe('A')
  })

  it('should not mutate original array', () => {
    const original = [...items]
    renderHook(() => useSortedItems(items, true))
    expect(items).toEqual(original)
  })
})
