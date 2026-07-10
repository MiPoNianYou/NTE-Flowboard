import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { usePendingDelete } from '../../src/hooks/usePendingDelete'
import { MS } from '../../src/utils/constants'

describe('usePendingDelete', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should call onDelete immediately when shouldConfirmDelete is false', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(false, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })

    expect(onDelete).toHaveBeenCalledWith('a')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('should not call onDelete on first click when shouldConfirmDelete is true', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('should call onDelete on second click when pending for same id', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })
    expect(onDelete).not.toHaveBeenCalled()

    act(() => {
      result.current.handleDelete('a')
    })
    expect(onDelete).toHaveBeenCalledWith('a')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('should mark id as pending after first click', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })

    expect(result.current.isPending('a')).toBe(true)
    expect(result.current.isPending('b')).toBe(false)
  })

  it('should clear pending after timeout', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })
    expect(result.current.isPending('a')).toBe(true)

    act(() => {
      vi.advanceTimersByTime(MS.DELETE_CONFIRM + 100)
    })

    expect(result.current.isPending('a')).toBe(false)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('should reset pending when clicking different id', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })
    expect(result.current.isPending('a')).toBe(true)

    act(() => {
      result.current.handleDelete('b')
    })
    expect(result.current.isPending('a')).toBe(false)
    expect(result.current.isPending('b')).toBe(true)
  })

  it('should return false for isPending when shouldConfirmDelete is false', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(false, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })

    expect(result.current.isPending('a')).toBe(false)
  })

  it('should clear pending timer on unmount', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result, unmount } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(MS.DELETE_CONFIRM + 100)
    })
  })
})
