import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNextResetLabel } from '../../hooks/useNextResetLabel'

afterEach(() => {
  vi.useRealTimers()
})

describe('useNextResetLabel', () => {
  it('formats the reset calendar duration for the active Checklist Cycle', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T20:00:00.000Z'))

    const { result } = renderHook(() =>
      useNextResetLabel({ activeTab: 'daily', serverRegion: 'asia' }),
    )

    expect(result.current).toBe('1小时0分钟后重置')
  })

  it('uses the real elapsed duration across American spring DST', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T08:00:00.000Z'))

    const { result } = renderHook(() =>
      useNextResetLabel({ activeTab: 'daily', serverRegion: 'america' }),
    )

    expect(result.current).toBe('1小时0分钟后重置')
  })

  it('uses the active cycle schedule rather than duplicating its calendar logic', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T20:00:00.000Z'))

    const { result } = renderHook(() =>
      useNextResetLabel({ activeTab: 'weekly', serverRegion: 'asia' }),
    )

    expect(result.current).toBe('1小时0分钟后重置')
  })
})
