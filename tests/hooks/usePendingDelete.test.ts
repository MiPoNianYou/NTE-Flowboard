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
    expect(result.current.isPending('a')).toBe(false)
  })

  it('should require a second click on the same item', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })
    expect(onDelete).not.toHaveBeenCalled()
    expect(result.current.isPending('a')).toBe(true)
    expect(result.current.isPending('b')).toBe(false)

    act(() => {
      result.current.handleDelete('a')
    })
    expect(onDelete).toHaveBeenCalledWith('a')
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(result.current.isPending('a')).toBe(false)
  })

  it('should replace the pending item and clear it after the timeout', () => {
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

    act(() => {
      vi.advanceTimersByTime(MS.DELETE_CONFIRM)
    })
    expect(result.current.isPending('b')).toBe(false)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('should clear pending timer on unmount', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { result, unmount } = renderHook(() => usePendingDelete(true, onDelete))

    act(() => {
      result.current.handleDelete('a')
    })

    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
