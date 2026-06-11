import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettings } from '../../src/hooks/useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return default values', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.autoMoveCompleted).toBe(true)
    expect(result.current.confirmDelete).toBe(true)
    expect(result.current.cloudSyncBehavior).toBe(true)
  })

  it('should read autoMoveCompleted from localStorage', () => {
    localStorage.setItem('nte-auto-move-completed', 'false')
    const { result } = renderHook(() => useSettings())
    expect(result.current.autoMoveCompleted).toBe(false)
  })

  it('should read confirmDelete from localStorage', () => {
    localStorage.setItem('nte-confirm-delete', 'false')
    const { result } = renderHook(() => useSettings())
    expect(result.current.confirmDelete).toBe(false)
  })

  it('should read cloudSyncBehavior from localStorage', () => {
    localStorage.setItem('nte-cloud-sync-behavior', 'false')
    const { result } = renderHook(() => useSettings())
    expect(result.current.cloudSyncBehavior).toBe(false)
  })

  it('should update autoMoveCompleted and persist', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.onAutoMoveCompletedChange(false))
    expect(result.current.autoMoveCompleted).toBe(false)
    expect(localStorage.getItem('nte-auto-move-completed')).toBe('false')
  })

  it('should update confirmDelete and persist', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.onConfirmDeleteChange(false))
    expect(result.current.confirmDelete).toBe(false)
    expect(localStorage.getItem('nte-confirm-delete')).toBe('false')
  })

  it('should update cloudSyncBehavior and persist', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.onCloudSyncBehaviorChange(false))
    expect(result.current.cloudSyncBehavior).toBe(false)
    expect(localStorage.getItem('nte-cloud-sync-behavior')).toBe('false')
  })

  it('should toggle values back and forth', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.autoMoveCompleted).toBe(true)
    act(() => result.current.onAutoMoveCompletedChange(false))
    expect(result.current.autoMoveCompleted).toBe(false)
    act(() => result.current.onAutoMoveCompletedChange(true))
    expect(result.current.autoMoveCompleted).toBe(true)
  })

  it('should return default showCustomTab as true', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.showCustomTab).toBe(true)
  })

  it('should read showCustomTab from localStorage', () => {
    localStorage.setItem('nte-show-custom-tab', 'false')
    const { result } = renderHook(() => useSettings())
    expect(result.current.showCustomTab).toBe(false)
  })

  it('should update showCustomTab and persist', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.onShowCustomTabChange(false))
    expect(result.current.showCustomTab).toBe(false)
    expect(localStorage.getItem('nte-show-custom-tab')).toBe('false')
  })

  it('should toggle showCustomTab back and forth', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.showCustomTab).toBe(true)
    act(() => result.current.onShowCustomTabChange(false))
    expect(result.current.showCustomTab).toBe(false)
    act(() => result.current.onShowCustomTabChange(true))
    expect(result.current.showCustomTab).toBe(true)
  })
})
