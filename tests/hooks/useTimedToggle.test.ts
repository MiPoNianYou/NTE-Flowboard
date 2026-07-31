import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useTimedToggle } from '../../src/hooks/useTimedToggle'
import { MS } from '../../src/utils/constants'

describe('useTimedToggle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('从隐藏状态触发，并在默认超时后自动隐藏', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle())
    expect(result.current.isShown).toBe(false)

    act(() => {
      result.current.trigger()
    })
    expect(result.current.isShown).toBe(true)

    act(() => {
      vi.advanceTimersByTime(MS.SUCCESS_HINT)
    })

    expect(result.current.isShown).toBe(false)
  })

  it('连续 trigger 会按自定义超时时间重置计时器', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle(3_000))

    act(() => {
      result.current.trigger()
    })

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current.isShown).toBe(true)

    act(() => {
      result.current.trigger()
    })

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current.isShown).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current.isShown).toBe(false)
  })

  it('dismiss 会立即隐藏并清除计时器', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle())

    act(() => {
      result.current.trigger()
    })
    expect(result.current.isShown).toBe(true)
    expect(vi.getTimerCount()).toBe(1)

    act(() => {
      result.current.dismiss()
    })
    expect(result.current.isShown).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('unmount 时清除计时器', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useTimedToggle())

    act(() => {
      result.current.trigger()
    })

    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
