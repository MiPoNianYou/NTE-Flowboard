import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistData } from '../../src/types'
import type { ServerRegion } from '../../src/types'
import type { SupportedLocale } from '../../src/types'
import { useNotifications } from '../../src/hooks/useNotifications'
import type {
  NotificationLifecycle,
  NotificationLifecycleSnapshot,
} from '../../src/utils/notificationLifecycle'

const data: ChecklistData = {
  daily: [],
  weekly: [],
  monthly: [],
  lastDailyReset: '2026-08-03T00:00:00.000Z',
  lastWeeklyReset: '2026-08-03T00:00:00.000Z',
  lastMonthlyReset: '2026-08-01T00:00:00.000Z',
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
}

const mockedModule = vi.hoisted(() => {
  let snapshot: NotificationLifecycleSnapshot = {
    available: true,
    status: 'disabled',
    preferences: { beforeResetEnabled: false, resetEnabled: true, leadHours: 6 },
    error: null,
    testCountdownSeconds: 0,
    isTestSending: false,
    lastTestSucceeded: false,
    testFailed: false,
  }
  const listeners = new Set<() => void>()
  const lifecycle: NotificationLifecycle = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: vi.fn(),
    stop: vi.fn(),
    updateContext: vi.fn(),
    updatePreferences: vi.fn(),
    enable: vi.fn(async () => undefined),
    disable: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
    sendTest: vi.fn(async () => undefined),
  }
  return {
    lifecycle,
    setSnapshot: (next: NotificationLifecycleSnapshot) => {
      snapshot = next
      listeners.forEach((listener) => listener())
    },
    reset: () => {
      snapshot = { ...snapshot, available: true, status: 'disabled' }
      listeners.clear()
    },
  }
})

vi.mock('../../src/utils/notificationLifecycle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/notificationLifecycle')>()
  return {
    ...actual,
    createNotificationLifecycle: vi.fn(() => mockedModule.lifecycle),
  }
})

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedModule.reset()
  })

  it('binds lifecycle, context, snapshot, and commands to React', async () => {
    type HookProps = {
      checklist: ChecklistData
      region: ServerRegion
      locale: SupportedLocale
    }
    const { result, rerender, unmount } = renderHook(
      ({ checklist, region, locale }: HookProps) => useNotifications(checklist, region, locale),
      { initialProps: { checklist: data, region: 'asia', locale: 'zh-CN' } as HookProps },
    )

    expect(mockedModule.lifecycle.start).toHaveBeenCalledOnce()
    expect(mockedModule.lifecycle.updateContext).toHaveBeenCalledWith(data, 'asia', 'zh-CN')
    act(() => {
      mockedModule.setSnapshot({ ...mockedModule.lifecycle.getSnapshot(), status: 'enabled' })
    })
    expect(result.current?.status).toBe('enabled')
    await result.current?.enable()
    expect(mockedModule.lifecycle.enable).toHaveBeenCalledOnce()

    rerender({ checklist: { ...data, daily: [] }, region: 'europe', locale: 'en-US' })
    expect(mockedModule.lifecycle.updateContext).toHaveBeenLastCalledWith(
      expect.any(Object),
      'europe',
      'en-US',
    )
    unmount()
    expect(mockedModule.lifecycle.stop).toHaveBeenCalledOnce()
  })

  it('returns no settings surface when public notification config is unavailable', () => {
    mockedModule.setSnapshot({ ...mockedModule.lifecycle.getSnapshot(), available: false })
    const { result } = renderHook(() => useNotifications(data, 'asia', 'zh-CN'))
    expect(result.current).toBeUndefined()
  })
})
