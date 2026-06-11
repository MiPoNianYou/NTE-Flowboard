import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useLayoutManagement } from '../../src/hooks/useLayoutManagement'

describe('useLayoutManagement', () => {
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('should default to two-column layout', () => {
    const { result } = renderHook(() => useLayoutManagement())
    expect(result.current.layout).toBe('two-column')
  })

  it('should read layout from localStorage', () => {
    localStorage.setItem('nte-layout', 'single')
    const { result } = renderHook(() => useLayoutManagement())
    expect(result.current.layout).toBe('single')
  })

  it('should toggle layout', () => {
    const { result } = renderHook(() => useLayoutManagement())
    act(() => {
      result.current.toggleLayout()
    })
    expect(result.current.layout).toBe('single')
    act(() => {
      result.current.toggleLayout()
    })
    expect(result.current.layout).toBe('two-column')
  })

  it('should persist layout to localStorage', () => {
    const { result } = renderHook(() => useLayoutManagement())
    act(() => {
      result.current.toggleLayout()
    })
    expect(localStorage.getItem('nte-layout')).toBe('single')
  })

  it('should set isLayoutTransitioning to true on toggle', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useLayoutManagement())
    act(() => {
      result.current.toggleLayout()
    })
    expect(result.current.isLayoutTransitioning).toBe(true)
  })

  it('should clear isLayoutTransitioning after 200ms', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useLayoutManagement())
    act(() => {
      result.current.toggleLayout()
    })
    expect(result.current.isLayoutTransitioning).toBe(true)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.isLayoutTransitioning).toBe(false)
  })

  it('should handle invalid localStorage value gracefully', () => {
    localStorage.setItem('nte-layout', 'invalid')
    const { result } = renderHook(() => useLayoutManagement())
    expect(result.current.layout).toBe('two-column')
  })
})
