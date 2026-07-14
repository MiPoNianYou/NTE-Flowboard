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

  it('exposes settings from data.settings', () => {
    const { result } = renderHook(() => useChecklist())
    expect(result.current.settings.serverRegion).toBe('asia')
    expect(result.current.settings.isAutoMoveEnabled).toBe(true)
    expect(result.current.settings.shouldConfirmDelete).toBe(true)
  })

  it('updateSettings merges partial settings into data.settings', () => {
    const { result } = renderHook(() => useChecklist())
    act(() => result.current.updateSettings({ isAutoMoveEnabled: false }))
    expect(result.current.settings.isAutoMoveEnabled).toBe(false)
    expect(result.current.settings.shouldConfirmDelete).toBe(true)
    expect(result.current.data.settings.isAutoMoveEnabled).toBe(false)
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

  it('addItem to weekly tab', () => {
    const { result } = renderHook(() => useChecklist())
    const beforeLen = result.current.data.weekly.length

    act(() => {
      result.current.addItem('weekly', '周任务', [])
    })

    expect(result.current.data.weekly).toHaveLength(beforeLen + 1)
  })

  it('toggleItem flips completed', () => {
    const { result } = renderHook(() => useChecklist())
    const firstId = result.current.data.daily[0].id
    const before = result.current.data.daily[0].isCompleted

    act(() => {
      result.current.toggleItem('daily', firstId)
    })

    expect(result.current.data.daily[0].isCompleted).toBe(!before)
  })

  it('toggleItem only affects matching id', () => {
    const { result } = renderHook(() => useChecklist())
    const second = result.current.data.daily[1]

    act(() => {
      result.current.toggleItem('daily', second.id)
    })

    expect(result.current.data.daily[0].isCompleted).toBe(false)
    expect(result.current.data.daily[1].isCompleted).toBe(true)
  })

  it('editItem updates text and tags', () => {
    const { result } = renderHook(() => useChecklist())
    const id = result.current.data.daily[0].id

    act(() => {
      result.current.editItem('daily', id, '改名', ['新标签'])
    })

    const item = result.current.data.daily.find((i) => i.id === id)
    expect(item!.text).toBe('改名')
    expect(item!.tags).toEqual(['新标签'])
  })

  it('removeItem removes item by id', () => {
    const { result } = renderHook(() => useChecklist())
    const beforeLen = result.current.data.daily.length
    const id = result.current.data.daily[2].id

    act(() => {
      result.current.removeItem('daily', id)
    })

    expect(result.current.data.daily).toHaveLength(beforeLen - 1)
    expect(result.current.data.daily.find((i) => i.id === id)).toBeUndefined()
  })

  it('hideItem sets hidden=true', () => {
    const { result } = renderHook(() => useChecklist())
    const id = result.current.data.daily[0].id

    act(() => {
      result.current.hideItem('daily', id)
    })

    expect(result.current.data.daily[0].isHidden).toBe(true)
  })

  it('showItem sets hidden=false', () => {
    const { result } = renderHook(() => useChecklist())
    const id = result.current.data.daily[0].id

    act(() => {
      result.current.hideItem('daily', id)
    })
    act(() => {
      result.current.showItem('daily', id)
    })

    expect(result.current.data.daily[0].isHidden).toBe(false)
  })

  it('reorderItem swaps two items and normalizes orders', () => {
    const { result } = renderHook(() => useChecklist())
    const first = result.current.data.daily[0]
    const second = result.current.data.daily[1]

    act(() => {
      result.current.reorderItem('daily', first.id, second.id)
    })

    const items = result.current.data.daily
    expect(items[0].text).toBe(second.text)
    expect(items[1].text).toBe(first.text)
    expect(items[0].order).toBe(1)
    expect(items[1].order).toBe(2)
  })

  it('reorderItem no-ops if same position', () => {
    const { result } = renderHook(() => useChecklist())
    const id = result.current.data.daily[0].id
    const snapshot = JSON.parse(JSON.stringify(result.current.data.daily))

    act(() => {
      result.current.reorderItem('daily', id, id)
    })

    expect(result.current.data.daily).toEqual(snapshot)
  })

  it('manualReset clears completed status', () => {
    const { result } = renderHook(() => useChecklist())

    act(() => {
      result.current.toggleItem('daily', result.current.data.daily[0].id)
    })
    expect(result.current.data.daily[0].isCompleted).toBe(true)

    act(() => {
      result.current.manualReset('daily')
    })

    expect(result.current.data.daily.every((i) => !i.isCompleted)).toBe(true)
  })

  it('manualReset updates lastDailyReset timestamp', () => {
    const { result } = renderHook(() => useChecklist())
    const before = result.current.data.lastDailyReset

    vi.advanceTimersByTime(1000)
    act(() => {
      result.current.manualReset('daily')
    })

    expect(result.current.data.lastDailyReset).not.toBe(before)
  })

  it('importFullData replaces all data', () => {
    const { result } = renderHook(() => useChecklist())
    const custom = {
      ...defaultData,
      daily: [
        { id: 'ci1', text: '导入任务', isCompleted: true, isHidden: false, order: 1, tags: [] },
      ],
      weekly: [],
    }

    act(() => {
      result.current.importFullData(custom)
    })

    expect(result.current.data.daily).toHaveLength(1)
    expect(result.current.data.daily[0].text).toBe('导入任务')
    expect(result.current.data.weekly).toHaveLength(0)
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
