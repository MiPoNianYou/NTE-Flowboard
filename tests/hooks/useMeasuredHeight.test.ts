import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMeasuredHeight } from '../../src/hooks/useMeasuredHeight'

describe('useMeasuredHeight', () => {
  let resizeCallback: ResizeObserverCallback | null = null
  let disconnectSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resizeCallback = null
    disconnectSpy = vi.fn()

    class FakeResizeObserver {
      callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        resizeCallback = callback
      }
      observe() {}
      unobserve() {}
      disconnect = disconnectSpy
    }

    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  it('初始 height 为 null', () => {
    const { result } = renderHook(() => useMeasuredHeight())
    const [, height] = result.current
    expect(height).toBeNull()
  })

  it('setRef 触发 ResizeObserver 后更新 height', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMeasuredHeight(0))
    const [setRef] = result.current

    const mockElement = document.createElement('div')

    act(() => {
      setRef(mockElement)
    })

    expect(resizeCallback).not.toBeNull()

    act(() => {
      resizeCallback!(
        [{ contentRect: { height: 120 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      )
    })

    expect(result.current[1]).toBe(120)
  })

  it('debounceMs > 0 时延迟更新 height', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMeasuredHeight(100))
    const [setRef] = result.current

    const mockElement = document.createElement('div')

    act(() => {
      setRef(mockElement)
    })

    act(() => {
      resizeCallback!(
        [{ contentRect: { height: 200 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      )
    })

    expect(result.current[1]).toBeNull()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current[1]).toBe(200)
  })

  it('setRef(null) 断开之前的 observer', () => {
    const { result } = renderHook(() => useMeasuredHeight(0))
    const [setRef] = result.current

    const mockElement = document.createElement('div')

    act(() => {
      setRef(mockElement)
    })

    act(() => {
      setRef(null)
    })

    expect(disconnectSpy).toHaveBeenCalled()
  })

  it('unmount 时断开 observer 并清除 timer', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useMeasuredHeight(100))
    const [setRef] = result.current

    const mockElement = document.createElement('div')

    act(() => {
      setRef(mockElement)
    })

    act(() => {
      resizeCallback!(
        [{ contentRect: { height: 300 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      )
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(200)
    })
  })

  it('切换元素时断开旧 observer 并观察新元素', () => {
    const observeSpy = vi.fn()

    class FakeResizeObserver {
      callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        resizeCallback = callback
      }
      observe = observeSpy
      unobserve() {}
      disconnect = disconnectSpy
    }

    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    const { result } = renderHook(() => useMeasuredHeight(0))
    const [setRef] = result.current

    const el1 = document.createElement('div')
    const el2 = document.createElement('div')

    act(() => {
      setRef(el1)
    })

    expect(disconnectSpy).toHaveBeenCalledTimes(0)
    expect(observeSpy).toHaveBeenCalledWith(el1)

    act(() => {
      setRef(el2)
    })

    expect(disconnectSpy).toHaveBeenCalledTimes(1)
    expect(observeSpy).toHaveBeenCalledWith(el2)
  })
})
