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
    expect(result.current.sortedItems.map((i) => i.text)).toEqual(['A', 'B', 'C', 'D'])
    expect(result.current.sortedItemIds).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('should stably move completed items to the bottom when enabled', () => {
    const { result } = renderHook(() => useSortedItems(mockItems, true))
    expect(result.current.sortedItems.map((i) => i.text)).toEqual(['A', 'C', 'B', 'D'])
    expect(result.current.sortedItemIds).toEqual(['s1', 's3', 's2', 's4'])
  })

  it('should handle empty mockItems array', () => {
    const { result } = renderHook(() => useSortedItems([], true))
    expect(result.current.sortedItems).toEqual([])
    expect(result.current.sortedItemIds).toEqual([])
  })

  it('should not mutate original array', () => {
    const original = [...mockItems]
    renderHook(() => useSortedItems(mockItems, true))
    expect(mockItems).toEqual(original)
  })
})
