import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChecklist } from '../../hooks/useChecklist'
import * as storage from '../../utils/storage'
import { MS } from '../../utils/constants'

const defaultData = storage.loadData()

describe('useChecklist', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(storage, 'saveData')
    vi.spyOn(storage, 'saveDataImmediate')
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

  it('persists data on change via saveData', () => {
    const { result } = renderHook(() => useChecklist())

    act(() => {
      result.current.addItem('daily', '测试持久化', [])
    })

    act(() => {
      vi.advanceTimersByTime(MS.STORAGE_DEBOUNCE + 50)
    })

    expect(storage.saveData).toHaveBeenCalled()
  })

  it("adopts another tab's saved checklist and cancels pending local persistence", () => {
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
    vi.mocked(storage.saveData).mockClear()
    localStorage.setItem('flowboard-checklist', JSON.stringify(remoteData))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'flowboard-checklist',
          newValue: JSON.stringify(remoteData),
        }),
      )
    })

    expect(result.current.data).toEqual(remoteData)

    act(() => {
      vi.advanceTimersByTime(MS.STORAGE_DEBOUNCE + 1)
    })

    expect(storage.saveData).not.toHaveBeenCalled()
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
