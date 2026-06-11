import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { usePendingDelete } from '../../src/hooks/usePendingDelete'
import { MS } from '../../src/utils/constants'

describe('usePendingDelete', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should call onDelete immediately when confirmDelete is false', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(false, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })

    expect(onDelete).toHaveBeenCalledWith(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('should not call onDelete on first click when confirmDelete is true', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('should call onDelete on second click when pending for same order', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })
    expect(onDelete).not.toHaveBeenCalled()

    act(() => {
      result.current.handleDelete(1)
    })
    expect(onDelete).toHaveBeenCalledWith(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('should mark order as pending after first click', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })

    expect(result.current.isPending(1)).toBe(true)
    expect(result.current.isPending(2)).toBe(false)
  })

  it('should clear pending after timeout', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })
    expect(result.current.isPending(1)).toBe(true)

    act(() => {
      vi.advanceTimersByTime(MS.DELETE_CONFIRM + 100)
    })

    expect(result.current.isPending(1)).toBe(false)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('should reset pending when clicking different order', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })
    expect(result.current.isPending(1)).toBe(true)

    act(() => {
      result.current.handleDelete(2)
    })
    expect(result.current.isPending(1)).toBe(false)
    expect(result.current.isPending(2)).toBe(true)
  })

  it('should return false for isPending when confirmDelete is false', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(false, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })

    // Even after clicking, isPending returns false because confirmDelete is false
    expect(result.current.isPending(1)).toBe(false)
  })

  it('should clear pending timer on unmount', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result, unmount } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete(1)
    })

    unmount()

    // Advancing timers after unmount should not cause errors
    act(() => {
      vi.advanceTimersByTime(MS.DELETE_CONFIRM + 100)
    })
  })
})
