import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { useItemHeights } from '../../src/hooks/useItemHeights'
import type { TabType } from '../../src/types'

describe('useItemHeights', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.removeItem('flowboard-item-heights')
    localStorage.removeItem('nte-item-heights')
  })

  it('should round meaningful changes and ignore sub-pixel noise', () => {
    const { result } = renderHook(() => useItemHeights('daily'))
    expect(result.current.getHeight('a')).toBeUndefined()

    act(() => {
      result.current.reportHeight('a', 48.4)
    })
    expect(result.current.getHeight('a')).toBe(48)

    act(() => {
      result.current.reportHeight('a', 48.9)
    })
    expect(result.current.getHeight('a')).toBe(48)

    act(() => {
      result.current.reportHeight('a', 51.6)
    })
    expect(result.current.getHeight('a')).toBe(52)
  })

  it('should isolate tabs and persist the combined cache after the debounce', () => {
    const { result, rerender } = renderHook(({ tab }) => useItemHeights(tab), {
      initialProps: { tab: 'daily' as TabType },
    })

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

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(JSON.parse(localStorage.getItem('flowboard-item-heights')!)).toEqual({
      daily: { a: 48 },
      weekly: { a: 60 },
    })
  })

  it('should load valid cached heights and ignore malformed entries', () => {
    localStorage.setItem(
      'flowboard-item-heights',
      JSON.stringify({ daily: { valid: 47.6, invalid: '48' }, weekly: null }),
    )

    const { result } = renderHook(() => useItemHeights('daily'))

    expect(result.current.getHeight('valid')).toBe(48)
    expect(result.current.getHeight('invalid')).toBeUndefined()
  })

  it('should recover from a corrupted cache', () => {
    localStorage.setItem('flowboard-item-heights', '{broken')

    const { result } = renderHook(() => useItemHeights('daily'))

    expect(result.current.getHeight('a')).toBeUndefined()
  })

  it('should migrate the legacy cache and delete it after verification', () => {
    localStorage.setItem('nte-item-heights', JSON.stringify({ daily: { legacy: 41.4 } }))
    const { result } = renderHook(() => useItemHeights('daily'))
    expect(result.current.getHeight('legacy')).toBe(41)
    expect(localStorage.getItem('nte-item-heights')).toBeNull()
  })

  it('should keep a conflicting legacy cache while using the current cache', () => {
    localStorage.setItem('flowboard-item-heights', JSON.stringify({ daily: { current: 50 } }))
    localStorage.setItem('nte-item-heights', JSON.stringify({ daily: { legacy: 41 } }))
    const { result } = renderHook(() => useItemHeights('daily'))
    expect(result.current.getHeight('current')).toBe(50)
    expect(result.current.getHeight('legacy')).toBeUndefined()
    expect(localStorage.getItem('nte-item-heights')).not.toBeNull()
  })
})
