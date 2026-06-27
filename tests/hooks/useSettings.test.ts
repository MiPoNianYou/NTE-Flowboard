import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsState } from '../../src/hooks/useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return default values', () => {
    const { result } = renderHook(() => useSettingsState())
    expect(result.current.settings.isAutoMoveEnabled).toBe(true)
    expect(result.current.settings.shouldConfirmDelete).toBe(true)
  })

  it('should read isAutoMoveEnabled from localStorage', () => {
    localStorage.setItem('flowboard-setting-auto-move', 'false')
    const { result } = renderHook(() => useSettingsState())
    expect(result.current.settings.isAutoMoveEnabled).toBe(false)
  })

  it('should read shouldConfirmDelete from localStorage', () => {
    localStorage.setItem('flowboard-setting-confirm-delete', 'false')
    const { result } = renderHook(() => useSettingsState())
    expect(result.current.settings.shouldConfirmDelete).toBe(false)
  })

  it('should update isAutoMoveEnabled and persist', () => {
    const { result } = renderHook(() => useSettingsState())
    act(() => result.current.updateSettings({ isAutoMoveEnabled: false }))
    expect(result.current.settings.isAutoMoveEnabled).toBe(false)
    expect(localStorage.getItem('flowboard-settings')).toContain('"isAutoMoveEnabled":false')
  })

  it('should update shouldConfirmDelete and persist', () => {
    const { result } = renderHook(() => useSettingsState())
    act(() => result.current.updateSettings({ shouldConfirmDelete: false }))
    expect(result.current.settings.shouldConfirmDelete).toBe(false)
    expect(localStorage.getItem('flowboard-settings')).toContain('"shouldConfirmDelete":false')
  })

  it('should toggle values back and forth', () => {
    const { result } = renderHook(() => useSettingsState())
    expect(result.current.settings.isAutoMoveEnabled).toBe(true)
    act(() => result.current.updateSettings({ isAutoMoveEnabled: false }))
    expect(result.current.settings.isAutoMoveEnabled).toBe(false)
    act(() => result.current.updateSettings({ isAutoMoveEnabled: true }))
    expect(result.current.settings.isAutoMoveEnabled).toBe(true)
  })
})
