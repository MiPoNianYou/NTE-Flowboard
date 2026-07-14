import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useTimedToggle } from '../../hooks/useTimedToggle'
import { MS } from '../../utils/constants'

describe('useTimedToggle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('初始状态 isShown 为 false', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle())
    expect(result.current.isShown).toBe(false)
  })

  it('trigger 后 isShown 变为 true', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle())

    act(() => {
      result.current.trigger()
    })

    expect(result.current.isShown).toBe(true)
  })

  it('默认超时后自动隐藏', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle())

    act(() => {
      result.current.trigger()
    })
    expect(result.current.isShown).toBe(true)

    act(() => {
      vi.advanceTimersByTime(MS.SUCCESS_HINT)
    })

    expect(result.current.isShown).toBe(false)
  })

  it('自定义超时参数生效', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle(5_000))

    act(() => {
      result.current.trigger()
    })

    act(() => {
      vi.advanceTimersByTime(4_999)
    })
    expect(result.current.isShown).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.isShown).toBe(false)
  })

  it('连续 trigger 重置计时器', () => {
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

  it('dismiss 立即隐藏', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle())

    act(() => {
      result.current.trigger()
    })
    expect(result.current.isShown).toBe(true)

    act(() => {
      result.current.dismiss()
    })
    expect(result.current.isShown).toBe(false)
  })

  it('dismiss 清除计时器，之后超时不会再次触发', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTimedToggle())

    act(() => {
      result.current.trigger()
    })

    act(() => {
      result.current.dismiss()
    })

    act(() => {
      vi.advanceTimersByTime(MS.SUCCESS_HINT + 1_000)
    })

    expect(result.current.isShown).toBe(false)
  })

  it('unmount 时清除计时器', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useTimedToggle())

    act(() => {
      result.current.trigger()
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(MS.SUCCESS_HINT + 1_000)
    })
  })
})
