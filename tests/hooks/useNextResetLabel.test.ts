import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useNextResetLabel } from '../../src/hooks/useNextResetLabel'

describe('useNextResetLabel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return a string containing "重置"', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      serverRegion: 'asia',
    }))
    expect(result.current).toContain('重置')
  })

  it('should return different labels for daily vs weekly', () => {
    vi.useFakeTimers()
    const daily = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      serverRegion: 'asia',
    }))
    const weekly = renderHook(() => useNextResetLabel({
      activeTab: 'weekly',
      serverRegion: 'asia',
    }))
    expect(daily.result.current).toContain('重置')
    expect(weekly.result.current).toContain('重置')
  })

  it('should support different server regions', () => {
    vi.useFakeTimers()
    const asia = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      serverRegion: 'asia',
    }))
    const america = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      serverRegion: 'america',
    }))
    expect(asia.result.current).toContain('重置')
    expect(america.result.current).toContain('重置')
  })

  it('should show "X小时Y分钟后重置" for daily tab', () => {
    // Set time to 10:00 AM server time → reset is tomorrow 05:00 → 19h away
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T02:00:00Z')) // 10:00 UTC+8
    const { result } = renderHook(() => useNextResetLabel({
      activeTab: 'daily',
      serverRegion: 'asia',
    }))
    expect(result.current).toMatch(/\d+小时\d+分钟后重置/)
  })

  it('should show "X天Y小时后重置" for weekly tab when > 24h away', () => {
    // Wednesday June 18, 10:00 UTC+8 → next Monday is June 23 → ~5 days 19h away
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-18T02:00:00Z'))
    const { result } = renderHook(() => useNextResetLabel({
      activeTab: 'weekly',
      serverRegion: 'asia',
    }))
    expect(result.current).toMatch(/\d+天\d+小时后重置/)
  })

  it('should return non-empty string for all regions', () => {
    vi.useFakeTimers()
    const regions = ['asia', 'america', 'europe'] as const
    for (const region of regions) {
      const { result } = renderHook(() => useNextResetLabel({
        activeTab: 'daily',
        serverRegion: region,
      }))
      expect(result.current.length).toBeGreaterThan(0)
      expect(result.current).toContain('重置')
    }
  })
})
