import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMeasuredHeight } from '../../src/hooks/useMeasuredHeight'

class ControllableResizeObserver {
  static instances: ControllableResizeObserver[] = []

  readonly observe = vi.fn()
  readonly disconnect = vi.fn()

  constructor(readonly callback: ResizeObserverCallback) {
    ControllableResizeObserver.instances.push(this)
  }

  unobserve() {}

  emit(height: number) {
    this.callback(
      [{ contentRect: { height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
}

const originalResizeObserver = globalThis.ResizeObserver

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver
  ControllableResizeObserver.instances = []
})

describe('useMeasuredHeight', () => {
  it('debounces resize updates and keeps the latest measured height', () => {
    vi.useFakeTimers()
    globalThis.ResizeObserver =
      ControllableResizeObserver as unknown as typeof globalThis.ResizeObserver
    const { result } = renderHook(() => useMeasuredHeight<HTMLDivElement>(100))
    const element = document.createElement('div')

    act(() => result.current[0](element))
    const observer = ControllableResizeObserver.instances[0]
    expect(observer.observe).toHaveBeenCalledWith(element)

    act(() => {
      observer.emit(40)
      observer.emit(72)
      vi.advanceTimersByTime(99)
    })
    expect(result.current[1]).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(result.current[1]).toBe(72)
  })

  it('updates immediately without debounce and disconnects during cleanup', () => {
    globalThis.ResizeObserver =
      ControllableResizeObserver as unknown as typeof globalThis.ResizeObserver
    const { result, unmount } = renderHook(() => useMeasuredHeight<HTMLDivElement>(0))

    act(() => result.current[0](document.createElement('div')))
    const observer = ControllableResizeObserver.instances[0]
    act(() => observer.emit(56))

    expect(result.current[1]).toBe(56)
    unmount()
    expect(observer.disconnect).toHaveBeenCalledTimes(1)
  })
})
