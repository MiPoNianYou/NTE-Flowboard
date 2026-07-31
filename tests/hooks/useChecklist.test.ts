import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { useChecklist } from '../../src/hooks/useChecklist'
import * as storage from '../../src/utils/storage'
import { MS } from '../../src/utils/constants'
import { DISPLAY_PREFERENCES_STORAGE_KEY } from '../../src/i18n/displayPreferences'
import * as restoreBackup from '../../src/utils/checklistRestoreBackup'
import type { ChecklistStorageAdapter, StoredChecklistSnapshot } from '../../src/utils/storage'

const defaultData = storage.loadData()

function createControllableAdapter() {
  let snapshot: StoredChecklistSnapshot | null = null
  let shouldFail = false
  const adapter: ChecklistStorageAdapter = {
    read: vi.fn(async () => snapshot),
    save: vi.fn(async (data, knownRevision) => {
      if (shouldFail) throw new Error('test persistence failure')
      snapshot = {
        data,
        revision: { counter: knownRevision.counter + 1, writerId: 'test' },
      }
      return snapshot
    }),
    flushNow: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
  }
  return {
    adapter,
    failWrites: () => {
      shouldFail = true
    },
    resumeWrites: () => {
      shouldFail = false
    },
  }
}

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

  it('restores default checklists for the current language and preserves settings', async () => {
    vi.setSystemTime(new Date('2026-07-29T12:34:56.000Z'))
    localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
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
    expect(result.current.data.daily[0].text).toBe("Make a wish at Nacupeda's Pond")
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

  it('aborts without changing data when the pre-restore backup cannot be saved', async () => {
    vi.spyOn(restoreBackup, 'saveRestoreBackup').mockReturnValue(false)
    const { result } = renderHook(() => useChecklist())
    const before = result.current.data
    let restoreResult = ''

    await act(async () => {
      restoreResult = await result.current.restoreDefaultChecklists()
    })

    expect(restoreResult).toBe('backup-failed')
    expect(result.current.data).toBe(before)
    expect(result.current.hasRestoreBackup).toBe(false)
  })

  it('undoes from the durable backup while preserving current settings', async () => {
    const { result } = renderHook(() => useChecklist())
    const customDaily = [{ ...defaultData.daily[0], id: 'custom', text: '恢复前任务' }]

    await act(async () => {
      result.current.importFullData({ ...defaultData, daily: customDaily })
      await result.current.restoreDefaultChecklists()
      result.current.updateSettings({ serverRegion: 'europe' })
    })

    expect(result.current.hasChangesSinceRestore).toBe(false)
    let undoResult = ''
    await act(async () => {
      undoResult = await result.current.undoRestoreDefaultChecklists()
    })

    expect(undoResult).toBe('success')
    expect(result.current.data.daily).toEqual(customDaily)
    expect(result.current.settings.serverRegion).toBe('europe')
    expect(result.current.hasRestoreBackup).toBe(false)
    expect(localStorage.getItem(restoreBackup.RESTORE_BACKUP_STORAGE_KEY)).toBeNull()
  })

  it('detects checklist edits made after restoring defaults', async () => {
    const { result } = renderHook(() => useChecklist())

    await act(async () => {
      await result.current.restoreDefaultChecklists()
      result.current.addItem('daily', '恢复后的新任务', [])
    })

    expect(result.current.hasChangesSinceRestore).toBe(true)
  })

  it('keeps the backup when restoring defaults cannot be persisted', async () => {
    const controlled = createControllableAdapter()
    vi.spyOn(storage, 'createChecklistStorageAdapter').mockReturnValue(controlled.adapter)
    const { result } = renderHook(() => useChecklist())
    await act(async () => {})
    controlled.failWrites()

    let restoreResult = ''
    await act(async () => {
      restoreResult = await result.current.restoreDefaultChecklists()
    })

    expect(restoreResult).toBe('persistence-failed')
    expect(result.current.hasRestoreBackup).toBe(true)
    expect(localStorage.getItem(restoreBackup.RESTORE_BACKUP_STORAGE_KEY)).not.toBeNull()

    const originalBackup = localStorage.getItem(restoreBackup.RESTORE_BACKUP_STORAGE_KEY)
    controlled.resumeWrites()
    await act(async () => {
      expect(await result.current.restoreDefaultChecklists()).toBe('success')
    })
    expect(localStorage.getItem(restoreBackup.RESTORE_BACKUP_STORAGE_KEY)).toBe(originalBackup)
  })

  it('keeps the backup when an undo cannot be persisted', async () => {
    const controlled = createControllableAdapter()
    vi.spyOn(storage, 'createChecklistStorageAdapter').mockReturnValue(controlled.adapter)
    const { result } = renderHook(() => useChecklist())
    await act(async () => {})

    act(() => {
      result.current.importFullData({
        ...defaultData,
        daily: [{ ...defaultData.daily[0], id: 'before-failed-undo', text: '恢复前任务' }],
      })
    })
    await act(async () => {})

    await act(async () => {
      await result.current.restoreDefaultChecklists()
    })
    controlled.failWrites()

    let undoResult = ''
    await act(async () => {
      undoResult = await result.current.undoRestoreDefaultChecklists()
    })

    expect(undoResult).toBe('persistence-failed')
    expect(result.current.hasRestoreBackup).toBe(true)
    expect(localStorage.getItem(restoreBackup.RESTORE_BACKUP_STORAGE_KEY)).not.toBeNull()
  })

  it('retries backup cleanup without reapplying an already persisted undo', async () => {
    const { result } = renderHook(() => useChecklist())
    const customDaily = [{ ...defaultData.daily[0], id: 'cleanup-retry', text: '恢复前任务' }]
    act(() => {
      result.current.importFullData({ ...defaultData, daily: customDaily })
    })
    await act(async () => {})
    await act(async () => {
      await result.current.restoreDefaultChecklists()
    })
    vi.spyOn(restoreBackup, 'clearRestoreBackup').mockReturnValueOnce(false)

    await act(async () => {
      expect(await result.current.undoRestoreDefaultChecklists()).toBe('cleanup-failed')
    })
    expect(result.current.data.daily).toEqual(customDaily)
    expect(result.current.hasRestoreBackup).toBe(true)

    await act(async () => {
      expect(await result.current.undoRestoreDefaultChecklists()).toBe('success')
    })
    expect(result.current.data.daily).toEqual(customDaily)
    expect(result.current.hasRestoreBackup).toBe(false)
  })

  it('loads the durable backup after remount and can still undo', async () => {
    const customDaily = [{ ...defaultData.daily[0], id: 'before-reload', text: '刷新前任务' }]
    const first = renderHook(() => useChecklist())

    await act(async () => {
      first.result.current.importFullData({ ...defaultData, daily: customDaily })
      await first.result.current.restoreDefaultChecklists()
    })
    first.unmount()

    const second = renderHook(() => useChecklist())
    await act(async () => {})
    expect(second.result.current.hasRestoreBackup).toBe(true)
    expect(second.result.current.hasChangesSinceRestore).toBe(false)

    await act(async () => {
      expect(await second.result.current.undoRestoreDefaultChecklists()).toBe('success')
    })
    expect(second.result.current.data.daily).toEqual(customDaily)
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

    expect(storage.loadData().daily.some((item) => item.text === 'StrictMode 持久化')).toBe(true)
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
    vi.mocked(storage.saveData).mockClear()
    localStorage.setItem('flowboard-checklist', JSON.stringify(remoteData))

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'flowboard-checklist',
          newValue: JSON.stringify(remoteData),
        }),
      )
      await Promise.resolve()
    })

    expect(result.current.data.daily.some((item) => item.text === '未保存的本地任务')).toBe(true)

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
