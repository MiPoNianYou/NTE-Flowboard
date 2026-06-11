import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutoMoveCompleted } from '../../src/hooks/useAutoMoveCompleted'

describe('useAutoMoveCompleted', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should default to true when localStorage is empty', () => {
    const { result } = renderHook(() => useAutoMoveCompleted())
    expect(result.current.autoMoveCompleted).toBe(true)
  })

  it('should default to false when localStorage has "false"', () => {
    localStorage.setItem('nte-auto-move-completed', 'false')
    const { result } = renderHook(() => useAutoMoveCompleted())
    expect(result.current.autoMoveCompleted).toBe(false)
  })

  it('should update state and localStorage on change', () => {
    const { result } = renderHook(() => useAutoMoveCompleted())

    act(() => {
      result.current.onAutoMoveCompletedChange(false)
    })

    expect(result.current.autoMoveCompleted).toBe(false)
    expect(localStorage.getItem('nte-auto-move-completed')).toBe('false')
  })

  it('should toggle back to true', () => {
    const { result } = renderHook(() => useAutoMoveCompleted())

    act(() => {
      result.current.onAutoMoveCompletedChange(false)
    })
    act(() => {
      result.current.onAutoMoveCompletedChange(true)
    })

    expect(result.current.autoMoveCompleted).toBe(true)
    expect(localStorage.getItem('nte-auto-move-completed')).toBe('true')
  })
})
