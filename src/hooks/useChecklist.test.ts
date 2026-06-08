import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChecklist } from './useChecklist'
import * as storage from '../utils/storage'
import { MS } from '../utils/constants'

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
    expect(added.completed).toBe(false)
    expect(added.hidden).toBe(false)
    expect(added.tags).toEqual(['标签1'])
    expect(added.order).toBe(beforeLen + 1)
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
    const firstOrder = result.current.data.daily[0].order
    const before = result.current.data.daily[0].completed

    act(() => {
      result.current.toggleItem('daily', firstOrder)
    })

    expect(result.current.data.daily[0].completed).toBe(!before)
  })

  it('toggleItem only affects matching order', () => {
    const { result } = renderHook(() => useChecklist())
    const second = result.current.data.daily[1]

    act(() => {
      result.current.toggleItem('daily', second.order)
    })

    expect(result.current.data.daily[0].completed).toBe(false)
    expect(result.current.data.daily[1].completed).toBe(true)
  })

  it('editItem updates text and tags', () => {
    const { result } = renderHook(() => useChecklist())
    const order = result.current.data.daily[0].order

    act(() => {
      result.current.editItem('daily', order, '改名', ['新标签'])
    })

    const item = result.current.data.daily.find((i) => i.order === order)
    expect(item!.text).toBe('改名')
    expect(item!.tags).toEqual(['新标签'])
  })

  it('deleteItem removes item by order', () => {
    const { result } = renderHook(() => useChecklist())
    const beforeLen = result.current.data.daily.length
    const order = result.current.data.daily[2].order

    act(() => {
      result.current.deleteItem('daily', order)
    })

    expect(result.current.data.daily).toHaveLength(beforeLen - 1)
    expect(result.current.data.daily.find((i) => i.order === order)).toBeUndefined()
  })

  it('hideItem sets hidden=true', () => {
    const { result } = renderHook(() => useChecklist())
    const order = result.current.data.daily[0].order

    act(() => {
      result.current.hideItem('daily', order)
    })

    expect(result.current.data.daily[0].hidden).toBe(true)
  })

  it('showItem sets hidden=false', () => {
    const { result } = renderHook(() => useChecklist())
    const order = result.current.data.daily[0].order

    act(() => {
      result.current.hideItem('daily', order)
    })
    act(() => {
      result.current.showItem('daily', order)
    })

    expect(result.current.data.daily[0].hidden).toBe(false)
  })

  it('reorderItems swaps two items and normalizes orders', () => {
    const { result } = renderHook(() => useChecklist())
    const first = result.current.data.daily[0]
    const second = result.current.data.daily[1]

    act(() => {
      result.current.reorderItems('daily', first.order, second.order)
    })

    const items = result.current.data.daily
    expect(items[0].text).toBe(second.text)
    expect(items[1].text).toBe(first.text)
    expect(items[0].order).toBe(1)
    expect(items[1].order).toBe(2)
  })

  it('reorderItems no-ops if same position', () => {
    const { result } = renderHook(() => useChecklist())
    const order = result.current.data.daily[0].order
    const snapshot = JSON.parse(JSON.stringify(result.current.data.daily))

    act(() => {
      result.current.reorderItems('daily', order, order)
    })

    expect(result.current.data.daily).toEqual(snapshot)
  })

  it('manualReset clears completed status', () => {
    const { result } = renderHook(() => useChecklist())

    act(() => {
      result.current.toggleItem('daily', result.current.data.daily[0].order)
    })
    expect(result.current.data.daily[0].completed).toBe(true)

    act(() => {
      result.current.manualReset('daily')
    })

    expect(result.current.data.daily.every((i) => !i.completed)).toBe(true)
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
        { text: '导入任务', completed: true, hidden: false, order: 1, tags: [] },
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

  it('updateResetConfig changes serverRegion', () => {
    const { result } = renderHook(() => useChecklist())

    act(() => {
      result.current.updateResetConfig({ serverRegion: 'europe' })
    })

    expect(result.current.data.resetConfig.serverRegion).toBe('europe')
  })

  it('persists data on change via saveData', () => {
    const { result } = renderHook(() => useChecklist())

    act(() => {
      result.current.addItem('daily', '测试持久化', [])
    })

    // saveData is debounced, advance past debounce
    act(() => {
      vi.advanceTimersByTime(MS.STORAGE_DEBOUNCE + 50)
    })

    expect(storage.saveData).toHaveBeenCalled()
  })
})
