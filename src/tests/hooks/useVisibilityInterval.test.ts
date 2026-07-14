import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { useVisibilityInterval } from '../../hooks/useVisibilityInterval'

function setVisible(visible: boolean) {
  Object.defineProperty(document, 'hidden', {
    value: !visible,
    configurable: true,
    writable: true,
  })
}

function dispatchVisibilityChange() {
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useVisibilityInterval', () => {
  beforeEach(() => {
    setVisible(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('页面可见时按间隔调用 callback', () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    renderHook(() => useVisibilityInterval(callback, 1000))

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('页面隐藏时暂停 interval', () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    renderHook(() => useVisibilityInterval(callback, 1000))

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      setVisible(false)
      dispatchVisibilityChange()
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('页面恢复可见时立即调用一次并重启 interval', () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    renderHook(() => useVisibilityInterval(callback, 1000))

    act(() => {
      setVisible(false)
      dispatchVisibilityChange()
    })

    act(() => {
      setVisible(true)
      dispatchVisibilityChange()
    })

    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('isEnabled 为 false 时不启动 interval', () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    renderHook(() => useVisibilityInterval(callback, 1000, false))

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('unmount 时清除 interval 和事件监听', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() => useVisibilityInterval(callback, 1000))

    unmount()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(callback).not.toHaveBeenCalled()

    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })

  it('intervalMs 变化时重启 interval', () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    const { rerender } = renderHook(({ ms }) => useVisibilityInterval(callback, ms), {
      initialProps: { ms: 2000 },
    })

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(callback).toHaveBeenCalledTimes(1)

    rerender({ ms: 1000 })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('callback 更新后使用最新的引用', () => {
    vi.useFakeTimers()
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { rerender } = renderHook(({ cb }) => useVisibilityInterval(cb, 1000), {
      initialProps: { cb: callback1 },
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback1).toHaveBeenCalledTimes(1)

    rerender({ cb: callback2 })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback2).toHaveBeenCalledTimes(1)
    expect(callback1).toHaveBeenCalledTimes(1)
  })
})
