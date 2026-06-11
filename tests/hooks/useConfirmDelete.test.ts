import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete'

describe('useConfirmDelete', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should default to true when localStorage is empty', () => {
    const { result } = renderHook(() => useConfirmDelete())
    expect(result.current.confirmDelete).toBe(true)
  })

  it('should default to false when localStorage has "false"', () => {
    localStorage.setItem('nte-confirm-delete', 'false')
    const { result } = renderHook(() => useConfirmDelete())
    expect(result.current.confirmDelete).toBe(false)
  })

  it('should update state and localStorage on change', () => {
    const { result } = renderHook(() => useConfirmDelete())

    act(() => {
      result.current.onConfirmDeleteChange(false)
    })

    expect(result.current.confirmDelete).toBe(false)
    expect(localStorage.getItem('nte-confirm-delete')).toBe('false')
  })

  it('should toggle back to true', () => {
    const { result } = renderHook(() => useConfirmDelete())

    act(() => {
      result.current.onConfirmDeleteChange(false)
    })
    act(() => {
      result.current.onConfirmDeleteChange(true)
    })

    expect(result.current.confirmDelete).toBe(true)
    expect(localStorage.getItem('nte-confirm-delete')).toBe('true')
  })
})
