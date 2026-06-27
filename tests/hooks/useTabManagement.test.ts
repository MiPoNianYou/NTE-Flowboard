import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTabManagement } from '../../src/hooks/useTabManagement'

describe('useTabManagement', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should default activeTab to daily', () => {
    const { result } = renderHook(() => useTabManagement())
    expect(result.current.activeTab).toBe('daily')
  })

  it('should read activeTab from localStorage', () => {
    localStorage.setItem('flowboard-active-tab', 'weekly')
    const { result } = renderHook(() => useTabManagement())
    expect(result.current.activeTab).toBe('weekly')
  })

  it('should persist activeTab to localStorage', () => {
    const { result } = renderHook(() => useTabManagement())
    act(() => {
      result.current.setActiveTab('weekly')
    })
    expect(localStorage.getItem('flowboard-active-tab')).toBe('weekly')
  })

  it('activeTab should be set correctly', () => {
    const { result } = renderHook(() => useTabManagement())
    act(() => {
      result.current.setActiveTab('weekly')
    })
    expect(result.current.activeTab).toBe('weekly')
  })
})
