import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSupabaseSync } from '../../src/hooks/useSupabaseSync'
import type { ChecklistData } from '../../src/types'
import { MS } from '../../src/utils/constants'
import { DEFAULT_CHECKLIST_DATA } from '../../src/utils/defaultData'

vi.mock('../../src/utils/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/supabase')>()
  return {
    ...actual,
    loadSupabaseConfig: vi.fn(() => null),
    saveSupabaseConfig: vi.fn(),
    clearSyncConfig: vi.fn(),
    loadLastSyncTime: vi.fn(() => null),
    saveLastSyncTime: vi.fn(),
    loadLastSeenTime: vi.fn(() => null),
    saveLastSeenTime: vi.fn(),
    resetClient: vi.fn(),
    validateConfig: vi.fn(),
    pushData: vi.fn(),
    pullData: vi.fn(),
    subscribeToChanges: vi.fn(() => vi.fn()),
  }
})

import * as supabase from '../../src/utils/supabase'

const mocked = vi.mocked(supabase)

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []

  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  close = vi.fn()

  constructor(name: string) {
    this.name = name
    MockBroadcastChannel.instances.push(this)
  }

  postMessage(_message: unknown) {}

  dispatch(message: unknown) {
    this.onmessage?.({ data: message } as MessageEvent)
  }

  static reset() {
    MockBroadcastChannel.instances = []
  }
}

const mockData: ChecklistData = {
  daily: [{ id: 'sb1', text: '任务1', isCompleted: false, isHidden: false, order: 1, tags: [] }],
  weekly: [],
  monthly: [],
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
  lastDailyReset: new Date().toISOString(),
  lastWeeklyReset: new Date().toISOString(),
  lastMonthlyReset: new Date().toISOString(),
}

describe('useSupabaseSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    MockBroadcastChannel.reset()
    mocked.loadSupabaseConfig.mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initial state: disconnected when no config', () => {
    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))
    expect(result.current.isConfigured).toBe(false)
    expect(result.current.syncStatus).toBe('disconnected')
    expect(result.current.lastSyncTime).toBeNull()
    expect(result.current.syncError).toBeNull()
  })

  it('initial state: connecting when config exists', () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))
    expect(result.current.syncStatus).toBe('connecting')
  })

  it('startup: validates config and pulls if valid', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)

    renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mocked.validateConfig).toHaveBeenCalledWith('p1', 'k1')
    expect(mocked.pullData).toHaveBeenCalled()
  })

  it('startup: disconnects if config invalid', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: false, reason: 'network' as const })

    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.isConfigured).toBe(false)
    expect(result.current.syncStatus).toBe('disconnected')
  })

  it('setupSupabase: valid config sets connected and pulls', async () => {
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)
    mocked.pushData.mockResolvedValue(new Date().toISOString())

    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await result.current.setupSupabase('proj1', 'key1')
    })

    expect(result.current.isConfigured).toBe(true)
    expect(result.current.syncStatus).toBe('connected')
    expect(mocked.saveSupabaseConfig).toHaveBeenCalledWith({ projectId: 'proj1', anonKey: 'key1' })
  })

  it('setupSupabase imports complete remote data when local tasks are defaults', async () => {
    mocked.validateConfig.mockResolvedValue({ ok: true })
    const remoteData: ChecklistData = {
      ...mockData,
      daily: [
        {
          id: 'remote',
          text: '远程任务',
          isCompleted: true,
          isHidden: true,
          order: 9,
          tags: ['远程'],
        },
      ],
      settings: { serverRegion: 'europe', isAutoMoveEnabled: false, shouldConfirmDelete: false },
      uiPreferences: { cloudPatchHidden: true },
      lastDailyReset: '2026-07-01T00:00:00.000Z',
    }
    mocked.pullData.mockResolvedValue({ data: remoteData, updatedAt: '2026-07-01T01:00:00.000Z' })
    mocked.pushData.mockResolvedValue('2026-07-01T01:00:00.000Z')
    const onImport = vi.fn()

    const { result } = renderHook(() =>
      useSupabaseSync({ data: structuredClone(DEFAULT_CHECKLIST_DATA), onDataImport: onImport }),
    )

    await act(async () => {
      await result.current.setupSupabase('proj1', 'key1')
    })

    expect(onImport).toHaveBeenCalledWith(remoteData)
    expect(mocked.pushData).not.toHaveBeenCalled()
  })

  it('setupSupabase pushes complete local data when a local task changed', async () => {
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue({ data: mockData, updatedAt: '2026-07-01T01:00:00.000Z' })
    mocked.pushData.mockResolvedValue('2026-07-01T02:00:00.000Z')
    const localData = structuredClone(DEFAULT_CHECKLIST_DATA)
    localData.daily[0].isCompleted = true
    const onImport = vi.fn()

    const { result } = renderHook(() =>
      useSupabaseSync({ data: localData, onDataImport: onImport }),
    )

    await act(async () => {
      await result.current.setupSupabase('proj1', 'key1')
    })

    expect(onImport).not.toHaveBeenCalled()
    expect(mocked.pushData).toHaveBeenCalledWith({ projectId: 'proj1', anonKey: 'key1' }, localData)
  })

  it('setupSupabase: invalid config sets error', async () => {
    mocked.validateConfig.mockResolvedValue({ ok: false, reason: 'network' as const })

    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await result.current.setupSupabase('bad', 'key')
    })

    expect(result.current.isConfigured).toBe(false)
    expect(result.current.syncStatus).toBe('disconnected')
    expect(result.current.syncError).toBeTruthy()
  })

  it('disconnect clears all state', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)
    mocked.pushData.mockResolvedValue(new Date().toISOString())

    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    act(() => {
      result.current.teardownSupabase()
    })

    expect(result.current.isConfigured).toBe(false)
    expect(result.current.syncStatus).toBe('disconnected')
    expect(result.current.lastSyncTime).toBeNull()
    expect(result.current.syncError).toBeNull()
    expect(mocked.clearSyncConfig).toHaveBeenCalled()
  })

  it('pullSync imports remote data when newer', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.loadLastSeenTime.mockReturnValue(new Date(Date.now() - 10000).toISOString())

    const remoteData: ChecklistData = {
      ...mockData,
      daily: [
        { id: 'sb2', text: '远程任务', isCompleted: true, isHidden: false, order: 1, tags: [] },
      ],
    }
    mocked.pullData.mockResolvedValue({
      data: remoteData,
      updatedAt: new Date(Date.now() + 10000).toISOString(),
    })
    mocked.pushData.mockResolvedValue(new Date().toISOString())

    const onImport = vi.fn()

    renderHook(() => useSupabaseSync({ data: mockData, onDataImport: onImport }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(onImport).toHaveBeenCalledWith(remoteData)
  })

  it('pullSync does not import on first sync when lastSeen is null', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.loadLastSeenTime.mockReturnValue(null)

    const remoteData: ChecklistData = {
      ...mockData,
      daily: [
        { id: 'sb3', text: '远程任务', isCompleted: true, isHidden: false, order: 1, tags: [] },
      ],
    }
    mocked.pullData.mockResolvedValue({
      data: remoteData,
      updatedAt: new Date(Date.now() + 10000).toISOString(),
    })
    mocked.pushData.mockResolvedValue(new Date().toISOString())

    const onImport = vi.fn()

    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: onImport }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    onImport.mockClear()

    await act(async () => {
      await result.current.triggerSync()
    })

    expect(onImport).not.toHaveBeenCalled()
    expect(mocked.pushData).toHaveBeenCalled()
  })

  it('triggerSync imports complete remote data when local tasks are defaults', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    const remoteData: ChecklistData = {
      ...mockData,
      daily: [
        {
          id: 'remote-trigger',
          text: '手动远程任务',
          isCompleted: true,
          isHidden: false,
          order: 1,
          tags: [],
        },
      ],
      settings: { serverRegion: 'america', isAutoMoveEnabled: false, shouldConfirmDelete: false },
      uiPreferences: { cloudPatchHidden: true },
    }
    mocked.pullData.mockResolvedValue({ data: remoteData, updatedAt: '2026-07-01T01:00:00.000Z' })
    mocked.pushData.mockResolvedValue('2026-07-01T01:00:00.000Z')
    const onImport = vi.fn()

    const { result } = renderHook(() =>
      useSupabaseSync({ data: structuredClone(DEFAULT_CHECKLIST_DATA), onDataImport: onImport }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    onImport.mockClear()
    mocked.pushData.mockClear()

    await act(async () => {
      await result.current.triggerSync()
    })

    expect(onImport).toHaveBeenCalledWith(remoteData)
    expect(mocked.pushData).not.toHaveBeenCalled()
  })

  it('triggerSync pushes complete local data when a local task changed', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue({ data: mockData, updatedAt: '2026-07-01T01:00:00.000Z' })
    mocked.pushData.mockResolvedValue('2026-07-01T02:00:00.000Z')
    const localData = structuredClone(DEFAULT_CHECKLIST_DATA)
    localData.daily[0].isCompleted = true
    const onImport = vi.fn()

    const { result } = renderHook(() =>
      useSupabaseSync({ data: localData, onDataImport: onImport }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    onImport.mockClear()
    mocked.pushData.mockClear()

    await act(async () => {
      await result.current.triggerSync()
    })

    expect(onImport).not.toHaveBeenCalled()
    expect(mocked.pushData).toHaveBeenCalledWith({ projectId: 'p1', anonKey: 'k1' }, localData)
  })

  it('pullSync does not import when remote is older', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })

    mocked.loadLastSeenTime.mockReturnValue(new Date(Date.now() + 100000).toISOString())

    const remoteData: ChecklistData = {
      ...mockData,
      daily: [
        { id: 'sb4', text: '远程任务', isCompleted: true, isHidden: false, order: 1, tags: [] },
      ],
    }
    mocked.pullData.mockResolvedValue({
      data: remoteData,
      updatedAt: new Date(Date.now() - 10000).toISOString(),
    })
    mocked.pushData.mockResolvedValue(new Date().toISOString())

    const onImport = vi.fn()

    renderHook(() => useSupabaseSync({ data: mockData, onDataImport: onImport }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(onImport).not.toHaveBeenCalled()
  })

  it('Realtime imports a newer remote revision over pending local changes without re-pushing it', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.loadLastSeenTime.mockReturnValue('2026-07-01T00:00:00.000Z')
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValueOnce(null)
    const remoteData: ChecklistData = {
      ...mockData,
      daily: [
        {
          id: 'remote-realtime',
          text: '远程更新',
          isCompleted: true,
          isHidden: false,
          order: 1,
          tags: [],
        },
      ],
      settings: { serverRegion: 'europe', isAutoMoveEnabled: false, shouldConfirmDelete: false },
      uiPreferences: { cloudPatchHidden: true },
      lastDailyReset: '2026-07-01T01:00:00.000Z',
    }
    mocked.pullData.mockResolvedValue({ data: remoteData, updatedAt: '2026-07-01T01:00:00.000Z' })
    mocked.pushData.mockResolvedValue('2026-07-01T02:00:00.000Z')
    let onRealtimeChange: (() => void) | undefined
    mocked.subscribeToChanges.mockImplementation((_config, onChange) => {
      onRealtimeChange = onChange
      return vi.fn()
    })

    const { result } = renderHook(() => {
      const [data, setData] = useState(mockData)
      return { data, sync: useSupabaseSync({ data, onDataImport: setData }), setData }
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    act(() => {
      result.current.setData({
        ...mockData,
        daily: [{ ...mockData.daily[0], text: '本地未上传修改' }],
      })
    })
    mocked.pushData.mockClear()

    act(() => {
      onRealtimeChange?.()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MS.REALTIME_DEBOUNCE)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE + 1)
    })

    expect(mocked.pullData).toHaveBeenCalledTimes(2)
    expect(mocked.pushData).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(remoteData)
  })

  it('manual sync imports a newer remote revision without re-pushing it', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.loadLastSeenTime.mockReturnValue('2026-07-01T00:00:00.000Z')
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValueOnce(null)
    const remoteData: ChecklistData = {
      ...mockData,
      daily: [
        {
          id: 'remote-manual',
          text: '手动远程更新',
          isCompleted: true,
          isHidden: false,
          order: 1,
          tags: [],
        },
      ],
      settings: { serverRegion: 'america', isAutoMoveEnabled: false, shouldConfirmDelete: false },
      uiPreferences: { cloudPatchHidden: true },
      lastDailyReset: '2026-07-01T01:00:00.000Z',
    }
    mocked.pullData.mockResolvedValue({ data: remoteData, updatedAt: '2026-07-01T01:00:00.000Z' })
    mocked.pushData.mockResolvedValue('2026-07-01T02:00:00.000Z')

    const { result } = renderHook(() => {
      const [data, setData] = useState(mockData)
      return { data, sync: useSupabaseSync({ data, onDataImport: setData }), setData }
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    act(() => {
      result.current.setData({
        ...mockData,
        daily: [{ ...mockData.daily[0], text: '本地未上传修改' }],
      })
    })
    mocked.pushData.mockClear()

    await act(async () => {
      await result.current.sync.triggerSync()
      await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE + 1)
    })

    expect(mocked.pushData).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(remoteData)
  })

  it('does not push data imported from another local browser tab', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)
    mocked.pushData.mockResolvedValue('2026-07-01T02:00:00.000Z')
    const externalData: ChecklistData = {
      ...mockData,
      daily: [
        {
          id: 'other-tab',
          text: '其他标签任务',
          isCompleted: true,
          isHidden: false,
          order: 1,
          tags: [],
        },
      ],
    }

    const { result, rerender } = renderHook(
      ({ data, externalDataVersion }) =>
        useSupabaseSync({ data, onDataImport: vi.fn(), externalDataVersion }),
      { initialProps: { data: mockData, externalDataVersion: 0 } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    mocked.pushData.mockClear()

    rerender({ data: externalData, externalDataVersion: 1 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE + 1)
    })

    expect(result.current.syncStatus).toBe('connected')
    expect(mocked.pushData).not.toHaveBeenCalled()
  })

  it('pullData error sets syncError', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockRejectedValue(
      new (supabase.SyncError as unknown as new (msg: string, code: string) => Error)(
        '拉取失败',
        'PULL_ERROR',
      ),
    )

    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.syncStatus).toBe('error')
    expect(result.current.syncError).toBeTruthy()
  })

  it('auto-recovers from error after ERROR_RECOVERY timeout', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockRejectedValueOnce(
      new (supabase.SyncError as unknown as new (msg: string, code: string) => Error)(
        '网络异常',
        'PULL_ERROR',
      ),
    )
    mocked.pullData.mockResolvedValue(null)

    const { result } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.syncStatus).toBe('error')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MS.ERROR_RECOVERY + 100)
    })

    expect(result.current.syncStatus).toBe('connected')
  })

  it('backs off retry delay across repeated pull failures', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockRejectedValue(
      new (supabase.SyncError as unknown as new (msg: string, code: string) => Error)(
        '网络异常',
        'PULL_ERROR',
      ),
    )

    renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mocked.pullData).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MS.ERROR_RECOVERY + 100)
    })

    expect(mocked.pullData).toHaveBeenCalledTimes(2)

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), MS.ERROR_RECOVERY)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), MS.ERROR_RECOVERY * 3)
  })

  it('forces a push when network comes back and local changes are pending', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)
    mocked.pushData.mockResolvedValue(new Date().toISOString())

    const { rerender } = renderHook(
      ({ data }) => useSupabaseSync({ data, onDataImport: vi.fn() }),
      { initialProps: { data: mockData } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    mocked.pushData.mockClear()

    rerender({
      data: {
        ...mockData,
        daily: [
          {
            ...mockData.daily[0],
            text: '本地已修改',
          },
        ],
      },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    window.dispatchEvent(new Event('offline'))

    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mocked.pushData).toHaveBeenCalledTimes(1)
  })

  it('pulls after receiving a cross-tab sync message through BroadcastChannel', async () => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)

    renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    mocked.pullData.mockClear()

    await act(async () => {
      MockBroadcastChannel.instances[0]?.dispatch({ type: 'sync-updated' })
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mocked.pullData).toHaveBeenCalledTimes(1)
  })

  it('falls back to storage events and cleans up cross-tab listeners on unmount', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)

    const { unmount } = renderHook(() => useSupabaseSync({ data: mockData, onDataImport: vi.fn() }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    mocked.pullData.mockClear()

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'flowboard-sync-event',
          newValue: String(Date.now()),
        }),
      )
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mocked.pullData).toHaveBeenCalledTimes(1)

    unmount()

    expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))
  })

  it('pullData returning null means no remote data', async () => {
    mocked.loadSupabaseConfig.mockReturnValue({ projectId: 'p1', anonKey: 'k1' })
    mocked.validateConfig.mockResolvedValue({ ok: true })
    mocked.pullData.mockResolvedValue(null)
    mocked.pushData.mockResolvedValue(new Date().toISOString())

    const onImport = vi.fn()

    renderHook(() => useSupabaseSync({ data: mockData, onDataImport: onImport }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(onImport).not.toHaveBeenCalled()
  })
})
