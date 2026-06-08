import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useNextResetLabel } from './useNextResetLabel'

describe('useNextResetLabel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return a string containing "重置"', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      resetConfig: { serverRegion: 'asia' },
    }))
    expect(result.current).toContain('重置')
  })

  it('should return different labels for daily vs weekly', () => {
    vi.useFakeTimers()
    const daily = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      resetConfig: { serverRegion: 'asia' },
    }))
    const weekly = renderHook(() => useNextResetLabel({
      activeTab: 'weekly',
      resetConfig: { serverRegion: 'asia' },
    }))
    expect(daily.result.current).toContain('重置')
    expect(weekly.result.current).toContain('重置')
  })

  it('should support different server regions', () => {
    vi.useFakeTimers()
    const asia = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      resetConfig: { serverRegion: 'asia' },
    }))
    const america = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      resetConfig: { serverRegion: 'america' },
    }))
    expect(asia.result.current).toContain('重置')
    expect(america.result.current).toContain('重置')
  })
})
