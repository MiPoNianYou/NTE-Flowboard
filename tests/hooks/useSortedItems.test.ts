import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useSortedItems } from '../../src/hooks/useSortedItems'
import type { ChecklistItem } from '../../src/types'

const mockItems: ChecklistItem[] = [
  { id: 's1', text: 'A', isCompleted: false, isHidden: false, order: 1, tags: [] },
  { id: 's2', text: 'B', isCompleted: true, isHidden: false, order: 2, tags: [] },
  { id: 's3', text: 'C', isCompleted: false, isHidden: false, order: 3, tags: [] },
  { id: 's4', text: 'D', isCompleted: true, isHidden: false, order: 4, tags: [] },
]

describe('useSortedItems', () => {
  it('should preserve order when isAutoMoveEnabled is false', () => {
    const { result } = renderHook(() => useSortedItems(mockItems, false))
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('should move completed mockItems to bottom when isAutoMoveEnabled is true', () => {
    const { result } = renderHook(() => useSortedItems(mockItems, true))
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'C', 'B', 'D'])
  })

  it('should maintain order among uncompleted mockItems', () => {
    const { result } = renderHook(() => useSortedItems(mockItems, true))
    const uncompleted = result.current.sortedItems.filter(i => !i.isCompleted)
    expect(uncompleted.map(i => i.order)).toEqual([1, 3])
  })

  it('should maintain order among completed mockItems', () => {
    const { result } = renderHook(() => useSortedItems(mockItems, true))
    const completed = result.current.sortedItems.filter(i => i.isCompleted)
    expect(completed.map(i => i.order)).toEqual([2, 4])
  })

  it('should return sortedItemIds matching sortedItems ids', () => {
    const { result } = renderHook(() => useSortedItems(mockItems, true))
    expect(result.current.sortedItemIds).toEqual(
      result.current.sortedItems.map(i => i.id),
    )
  })

  it('should handle empty mockItems array', () => {
    const { result } = renderHook(() => useSortedItems([], true))
    expect(result.current.sortedItems).toEqual([])
    expect(result.current.sortedItemIds).toEqual([])
  })

  it('should handle all completed mockItems', () => {
    const allCompleted = mockItems.map(i => ({ ...i, isCompleted: true }))
    const { result } = renderHook(() => useSortedItems(allCompleted, true))
    expect(result.current.sortedItems).toHaveLength(4)
    // All are completed, so order is preserved
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('should handle all uncompleted mockItems', () => {
    const allUncompleted = mockItems.map(i => ({ ...i, isCompleted: false }))
    const { result } = renderHook(() => useSortedItems(allUncompleted, true))
    expect(result.current.sortedItems.map(i => i.text)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('should handle single item', () => {
    const single = [mockItems[0]]
    const { result } = renderHook(() => useSortedItems(single, true))
    expect(result.current.sortedItems).toHaveLength(1)
    expect(result.current.sortedItems[0].text).toBe('A')
  })

  it('should not mutate original array', () => {
    const original = [...mockItems]
    renderHook(() => useSortedItems(mockItems, true))
    expect(mockItems).toEqual(original)
  })
})
