import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTabManagement } from '../../src/hooks/useTabManagement'

describe('useTabManagement', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.each([
    [null, 'daily'],
    ['invalid', 'daily'],
    ['weekly', 'weekly'],
  ])('should resolve stored tab %s to %s', (stored, expected) => {
    if (stored) localStorage.setItem('flowboard-active-tab', stored)
    const { result } = renderHook(() => useTabManagement())
    expect(result.current.activeTab).toBe(expected)
  })

  it('should update the tab, persistence, and navigation direction together', () => {
    const { result } = renderHook(() => useTabManagement())

    act(() => {
      result.current.setActiveTab('monthly')
    })
    expect(result.current.activeTab).toBe('monthly')
    expect(result.current.direction).toBe('down')
    expect(localStorage.getItem('flowboard-active-tab')).toBe('monthly')

    act(() => {
      result.current.setActiveTab('weekly')
    })
    expect(result.current.activeTab).toBe('weekly')
    expect(result.current.direction).toBe('up')
    expect(localStorage.getItem('flowboard-active-tab')).toBe('weekly')
  })
})
