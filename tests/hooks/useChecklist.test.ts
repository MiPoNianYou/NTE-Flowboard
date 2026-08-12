import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { useChecklist } from '../../src/hooks/useChecklist'
import { createChecklistStorageAdapter } from '../../src/utils/storage'
import { LOCAL_UI_PREFERENCES_STORAGE_KEY } from '../../src/utils/localUiPreferences'
import { createDefaultChecklistData } from '../../src/utils/defaultData'

const defaultData = createDefaultChecklistData('zh-CN')

describe('useChecklist', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('loads data on init', () => {
    const { result } = renderHook(() => useChecklist())
    expect(result.current.data.daily).toBeInstanceOf(Array)
    expect(result.current.data.weekly).toBeInstanceOf(Array)
  })

  it('immediately applies a due reset after changing server region', () => {
    vi.setSystemTime(new Date('2026-07-13T02:00:00.000Z'))
    const completedItem = {
      ...defaultData.daily[0],
      isCompleted: true,
      isHidden: true,
      text: '保留任务内容',
      tags: ['保留标签'],
      order: 7,
    }
    const { result } = renderHook(() => useChecklist())

    act(() => {
      result.current.importFullData({
        ...defaultData,
        daily: [completedItem, ...defaultData.daily.slice(1)],
        weekly: [{ ...completedItem, id: 'weekly-completed' }, ...defaultData.weekly.slice(1)],
        monthly: [{ ...completedItem, id: 'monthly-completed' }, ...defaultData.monthly.slice(1)],
        lastDailyReset: '2026-07-12T10:00:00.000Z',
        lastWeeklyReset: '2026-07-05T10:00:00.000Z',
        lastMonthlyReset: '2026-06-01T10:00:00.000Z',
        settings: { ...defaultData.settings, serverRegion: 'america' },
      })
    })

    expect(result.current.data.daily[0].isCompleted).toBe(true)

    act(() => {
      result.current.updateSettings({ serverRegion: 'asia' })
    })

    expect(result.current.data.daily[0]).toEqual({ ...completedItem, isCompleted: false })
    expect(result.current.data.weekly[0]).toEqual({
      ...completedItem,
      id: 'weekly-completed',
      isCompleted: false,
    })
    expect(result.current.data.monthly[0]).toEqual({
      ...completedItem,
      id: 'monthly-completed',
      isCompleted: false,
    })
  })

  it('addItem appends to correct tab with next order', () => {
    const { result } = renderHook(() => useChecklist())
    const beforeLen = result.current.data.daily.length

    act(() => {
      result.current.addItem('daily', '新任务', ['标签1'])
    })

    const items = result.current.data.daily
    expect(items).toHaveLength(beforeLen + 1)
    const added = items[items.length - 1]
    expect(added.text).toBe('新任务')
    expect(added.isCompleted).toBe(false)
    expect(added.isHidden).toBe(false)
    expect(added.tags).toEqual(['标签1'])
    expect(added.order).toBe(beforeLen + 1)
    expect(added.id).toBeTruthy()
  })

  it('restores default checklists for the current language and preserves settings', async () => {
    vi.setSystemTime(new Date('2026-07-29T12:34:56.000Z'))
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', language: 'en-US', timeFormat: '12h' }),
    )
    const { result } = renderHook(() => useChecklist())
    let restoreResult = ''

    await act(async () => {
      result.current.importFullData({
        ...defaultData,
        daily: [],
        weekly: [],
        monthly: [],
        settings: {
          serverRegion: 'europe',
          isAutoMoveEnabled: false,
          shouldConfirmDelete: false,
        },
        uiPreferences: { cloudPatchHidden: true },
      })
    })
    await act(async () => {
      restoreResult = await result.current.restoreDefaultChecklists()
    })

    expect(restoreResult).toBe('success')
    expect(result.current.hasRestoreBackup).toBe(true)
    expect(result.current.hasChangesSinceRestore).toBe(false)
    expect(result.current.data.daily[0].text).toBe(
      'Collect operating revenue from The Cafe by Origen',
    )
    expect(result.current.data.weekly[0].text).toBe('Complete the weekly Anomaly Pilgrimage')
    expect(result.current.data.monthly[0].text).toBe('Lost Exchange')
    expect(result.current.settings).toEqual({
      serverRegion: 'europe',
      isAutoMoveEnabled: false,
      shouldConfirmDelete: false,
    })
    expect(result.current.uiPreferences).toEqual({ cloudPatchHidden: true })
    expect(result.current.data.lastDailyReset).toBe('2026-07-29T12:34:56.000Z')
    expect(result.current.data.lastWeeklyReset).toBe('2026-07-29T12:34:56.000Z')
    expect(result.current.data.lastMonthlyReset).toBe('2026-07-29T12:34:56.000Z')
  })

  it('marks data as persisted after a change', async () => {
    const { result } = renderHook(() => useChecklist())

    act(() => {
      result.current.addItem('daily', '测试持久化', [])
    })

    await act(async () => {})

    expect(result.current.persistenceStatus).toBe('saved')
  })

  it('persists changes through a StrictMode mount cycle', async () => {
    const { result, unmount } = renderHook(() => useChecklist(), {
      wrapper: StrictMode,
    })

    act(() => {
      result.current.addItem('daily', 'StrictMode 持久化', [])
    })
    await act(async () => {})
    unmount()

    expect(
      createChecklistStorageAdapter()
        .load()
        .snapshot.data.daily.some((item) => item.text === 'StrictMode 持久化'),
    ).toBe(true)
  })

  it("keeps local changes when another tab's saved checklist arrives", async () => {
    const { result } = renderHook(() => useChecklist())
    const remoteData = {
      ...defaultData,
      daily: [
        {
          id: 'remote',
          text: '其他标签任务',
          isCompleted: true,
          isHidden: false,
          order: 1,
          tags: [],
        },
      ],
      settings: {
        serverRegion: 'europe' as const,
        isAutoMoveEnabled: false,
        shouldConfirmDelete: false,
      },
      uiPreferences: { cloudPatchHidden: true },
    }

    act(() => {
      result.current.addItem('daily', '未保存的本地任务', [])
    })
    const remoteSnapshot = { data: remoteData, revision: '999:remote-tab' }
    localStorage.setItem('flowboard-checklist', JSON.stringify(remoteSnapshot))

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'flowboard-checklist',
          newValue: JSON.stringify(remoteSnapshot),
        }),
      )
      await Promise.resolve()
    })

    expect(result.current.data.daily.some((item) => item.text === '未保存的本地任务')).toBe(true)

    expect(result.current.data.daily.some((item) => item.id === 'remote')).toBe(true)
  })

  it('ignores storage events for unrelated keys', () => {
    const { result } = renderHook(() => useChecklist())
    const before = result.current.data

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'flowboard-active-tab', newValue: 'weekly' }),
      )
    })

    expect(result.current.data).toBe(before)
  })
})
