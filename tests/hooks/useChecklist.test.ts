import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChecklist } from '../../src/hooks/useChecklist'
import * as storage from '../../src/utils/storage'
import { MS } from '../../src/utils/constants'
import type { BehaviorSettings } from '../../src/types'

const defaultSettings: BehaviorSettings = {
  serverRegion: 'asia',
  isAutoMoveEnabled: true,
  shouldConfirmDelete: true,
}

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
    const { result } = renderHook(() => useChecklist(defaultSettings))
    expect(result.current.data.daily).toBeInstanceOf(Array)
    expect(result.current.data.weekly).toBeInstanceOf(Array)
  })

  it('addItem appends to correct tab with next order', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
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
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const beforeLen = result.current.data.weekly.length

    act(() => {
      result.current.addItem('weekly', '周任务', [])
    })

    expect(result.current.data.weekly).toHaveLength(beforeLen + 1)
  })

  it('toggleItem flips completed', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const firstId = result.current.data.daily[0].id
    const before = result.current.data.daily[0].isCompleted

    act(() => {
      result.current.toggleItem('daily', firstId)
    })

    expect(result.current.data.daily[0].isCompleted).toBe(!before)
  })

  it('toggleItem only affects matching id', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const second = result.current.data.daily[1]

    act(() => {
      result.current.toggleItem('daily', second.id)
    })

    expect(result.current.data.daily[0].isCompleted).toBe(false)
    expect(result.current.data.daily[1].isCompleted).toBe(true)
  })

  it('editItem updates text and tags', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const id = result.current.data.daily[0].id

    act(() => {
      result.current.editItem('daily', id, '改名', ['新标签'])
    })

    const item = result.current.data.daily.find((i) => i.id === id)
    expect(item!.text).toBe('改名')
    expect(item!.tags).toEqual(['新标签'])
  })

  it('removeItem removes item by id', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const beforeLen = result.current.data.daily.length
    const id = result.current.data.daily[2].id

    act(() => {
      result.current.removeItem('daily', id)
    })

    expect(result.current.data.daily).toHaveLength(beforeLen - 1)
    expect(result.current.data.daily.find((i) => i.id === id)).toBeUndefined()
  })

  it('hideItem sets hidden=true', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const id = result.current.data.daily[0].id

    act(() => {
      result.current.hideItem('daily', id)
    })

    expect(result.current.data.daily[0].isHidden).toBe(true)
  })

  it('showItem sets hidden=false', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
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
    const { result } = renderHook(() => useChecklist(defaultSettings))
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
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const id = result.current.data.daily[0].id
    const snapshot = JSON.parse(JSON.stringify(result.current.data.daily))

    act(() => {
      result.current.reorderItem('daily', id, id)
    })

    expect(result.current.data.daily).toEqual(snapshot)
  })

  it('manualReset clears completed status', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))

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
    const { result } = renderHook(() => useChecklist(defaultSettings))
    const before = result.current.data.lastDailyReset

    vi.advanceTimersByTime(1000)
    act(() => {
      result.current.manualReset('daily')
    })

    expect(result.current.data.lastDailyReset).not.toBe(before)
  })

  it('importFullData replaces all data', () => {
    const { result } = renderHook(() => useChecklist(defaultSettings))
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
    const { result } = renderHook(() => useChecklist(defaultSettings))

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
