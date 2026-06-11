import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTabManagement } from '../../src/hooks/useTabManagement'

describe('useTabManagement', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should default activeTab to daily', () => {
    const { result } = renderHook(() => useTabManagement(true))
    expect(result.current.activeTab).toBe('daily')
  })

  it('should read activeTab from localStorage', () => {
    localStorage.setItem('nte-tab', 'weekly')
    const { result } = renderHook(() => useTabManagement(true))
    expect(result.current.activeTab).toBe('weekly')
  })

  it('should default previousTab to daily', () => {
    const { result } = renderHook(() => useTabManagement(true))
    expect(result.current.previousTab).toBe('daily')
  })

  it('should read previousTab from localStorage', () => {
    localStorage.setItem('nte-previous-tab', 'weekly')
    const { result } = renderHook(() => useTabManagement(true))
    expect(result.current.previousTab).toBe('weekly')
  })

  it('should persist activeTab to localStorage', () => {
    const { result } = renderHook(() => useTabManagement(true))
    act(() => {
      result.current.setActiveTab('weekly')
    })
    expect(localStorage.getItem('nte-tab')).toBe('weekly')
  })

  it('should persist previousTab to localStorage', () => {
    const { result } = renderHook(() => useTabManagement(true))
    act(() => {
      result.current.setPreviousTab('weekly')
    })
    expect(localStorage.getItem('nte-previous-tab')).toBe('weekly')
  })

  it('effectiveActiveTab should equal activeTab when showCustomTab is true', () => {
    const { result } = renderHook(() => useTabManagement(true))
    act(() => {
      result.current.setActiveTab('custom')
    })
    expect(result.current.effectiveActiveTab).toBe('custom')
  })

  it('effectiveActiveTab should fallback to previousTab when showCustomTab is false and activeTab is custom', () => {
    const { result } = renderHook(() => useTabManagement(false))
    act(() => {
      result.current.setActiveTab('custom')
    })
    expect(result.current.effectiveActiveTab).toBe('daily')
  })

  it('effectiveActiveTab should fallback to saved previousTab', () => {
    localStorage.setItem('nte-previous-tab', 'weekly')
    const { result } = renderHook(() => useTabManagement(false))
    act(() => {
      result.current.setActiveTab('custom')
    })
    expect(result.current.effectiveActiveTab).toBe('weekly')
  })

  it('effectiveActiveTab should equal activeTab for non-custom tabs even when showCustomTab is false', () => {
    const { result } = renderHook(() => useTabManagement(false))
    act(() => {
      result.current.setActiveTab('daily')
    })
    expect(result.current.effectiveActiveTab).toBe('daily')
  })
})
