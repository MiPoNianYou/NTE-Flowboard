import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useShowCustomTab } from '../../src/hooks/useShowCustomTab'

describe('useShowCustomTab', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should default to true when localStorage is empty', () => {
    const { result } = renderHook(() => useShowCustomTab())
    expect(result.current.showCustomTab).toBe(true)
  })

  it('should default to false when localStorage has "false"', () => {
    localStorage.setItem('nte-show-custom-tab', 'false')
    const { result } = renderHook(() => useShowCustomTab())
    expect(result.current.showCustomTab).toBe(false)
  })

  it('should default to true when localStorage has "true"', () => {
    localStorage.setItem('nte-show-custom-tab', 'true')
    const { result } = renderHook(() => useShowCustomTab())
    expect(result.current.showCustomTab).toBe(true)
  })

  it('should update state and localStorage on change', () => {
    const { result } = renderHook(() => useShowCustomTab())
    expect(result.current.showCustomTab).toBe(true)

    act(() => {
      result.current.onShowCustomTabChange(false)
    })

    expect(result.current.showCustomTab).toBe(false)
    expect(localStorage.getItem('nte-show-custom-tab')).toBe('false')
  })

  it('should toggle back to true', () => {
    const { result } = renderHook(() => useShowCustomTab())

    act(() => {
      result.current.onShowCustomTabChange(false)
    })
    act(() => {
      result.current.onShowCustomTabChange(true)
    })

    expect(result.current.showCustomTab).toBe(true)
    expect(localStorage.getItem('nte-show-custom-tab')).toBe('true')
  })
})
