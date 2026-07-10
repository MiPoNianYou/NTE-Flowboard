import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useItemHeights } from '../../src/hooks/useItemHeights'
import type { TabType } from '../../src/types'

describe('useItemHeights', () => {
  it('should return undefined for unmeasured items', () => {
    const { result } = renderHook(() => useItemHeights('daily'))
    expect(result.current.getHeight('a')).toBeUndefined()
  })

  it('should store reported heights', () => {
    const { result } = renderHook(() => useItemHeights('daily'))

    act(() => {
      result.current.reportHeight('a', 48)
    })

    expect(result.current.getHeight('a')).toBe(48)
  })

  it('should update height when reported again with >1px difference', () => {
    const { result } = renderHook(() => useItemHeights('daily'))

    act(() => {
      result.current.reportHeight('a', 48)
    })
    expect(result.current.getHeight('a')).toBe(48)

    act(() => {
      result.current.reportHeight('a', 52)
    })
    expect(result.current.getHeight('a')).toBe(52)
  })

  it('should ignore height changes <= 1px', () => {
    const { result } = renderHook(() => useItemHeights('daily'))

    act(() => {
      result.current.reportHeight('a', 48)
    })

    act(() => {
      result.current.reportHeight('a', 48.5)
    })

    expect(result.current.getHeight('a')).toBe(48)
  })

  it('should track multiple items independently', () => {
    const { result } = renderHook(() => useItemHeights('daily'))

    act(() => {
      result.current.reportHeight('a', 48)
      result.current.reportHeight('b', 52)
      result.current.reportHeight('c', 60)
    })

    expect(result.current.getHeight('a')).toBe(48)
    expect(result.current.getHeight('b')).toBe(52)
    expect(result.current.getHeight('c')).toBe(60)
  })

  it('should isolate heights per tab', () => {
    const { result, rerender } = renderHook(
      ({ tab }) => useItemHeights(tab),
      { initialProps: { tab: 'daily' as TabType } },
    )

    act(() => {
      result.current.reportHeight('a', 48)
    })

    rerender({ tab: 'weekly' as TabType })

    expect(result.current.getHeight('a')).toBeUndefined()

    act(() => {
      result.current.reportHeight('a', 60)
    })

    expect(result.current.getHeight('a')).toBe(60)

    rerender({ tab: 'daily' })
    expect(result.current.getHeight('a')).toBe(48)
  })
})
