import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSupabaseSync } from '../../src/hooks/useSupabaseSync'
import type { ChecklistData } from '../../src/types'
import type {
  CloudSynchronization,
  CloudSynchronizationOptions,
  CloudSynchronizationSnapshot,
} from '../../src/utils/cloudSynchronization'
import { DEFAULT_CHECKLIST_DATA } from '../../src/utils/defaultData'

const mockedModule = vi.hoisted(() => {
  let snapshot: CloudSynchronizationSnapshot = {
    isConfigured: false,
    syncStatus: 'disconnected',
    lastSyncTime: null,
    syncError: null,
    hasPendingLocalChanges: false,
    backgroundSyncStatus: 'inactive',
    requiresDatabaseUpgrade: false,
  }
  const listeners = new Set<() => void>()
  const synchronization: CloudSynchronization = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: vi.fn(),
    stop: vi.fn(),
    updateLocalData: vi.fn(),
    configure: vi.fn(async () => ({ ok: true as const })),
    syncNow: vi.fn(async () => ({ ok: true as const })),
    disconnect: vi.fn(),
    clearError: vi.fn(),
  }
  return {
    synchronization,
    setSnapshot: (next: CloudSynchronizationSnapshot) => {
      snapshot = next
      listeners.forEach((listener) => listener())
    },
    reset: () => {
      snapshot = {
        isConfigured: false,
        syncStatus: 'disconnected',
        lastSyncTime: null,
        syncError: null,
        hasPendingLocalChanges: false,
        backgroundSyncStatus: 'inactive',
        requiresDatabaseUpgrade: false,
      }
      listeners.clear()
    },
  }
})

vi.mock('../../src/utils/cloudSynchronization', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/cloudSynchronization')>()
  return {
    ...actual,
    createCloudSynchronization: vi.fn(() => mockedModule.synchronization),
  }
})

import { createCloudSynchronization } from '../../src/utils/cloudSynchronization'

describe('useSupabaseSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedModule.reset()
  })

  it('binds the module snapshot and lifecycle to React', () => {
    const { result, unmount } = renderHook(() =>
      useSupabaseSync({ data: DEFAULT_CHECKLIST_DATA, onDataImport: vi.fn() }),
    )

    expect(result.current).toMatchObject({
      isConfigured: false,
      syncStatus: 'disconnected',
      hasPendingLocalChanges: false,
    })
    expect(mockedModule.synchronization.start).toHaveBeenCalledOnce()
    expect(mockedModule.synchronization.updateLocalData).toHaveBeenCalledWith(
      DEFAULT_CHECKLIST_DATA,
    )

    unmount()
    expect(mockedModule.synchronization.stop).toHaveBeenCalledOnce()
  })

  it('updates React when the module publishes a new snapshot', () => {
    const { result } = renderHook(() =>
      useSupabaseSync({ data: DEFAULT_CHECKLIST_DATA, onDataImport: vi.fn() }),
    )

    act(() => {
      mockedModule.setSnapshot({
        isConfigured: true,
        syncStatus: 'connected',
        lastSyncTime: '2026-08-04T12:00:00.000Z',
        syncError: null,
        hasPendingLocalChanges: true,
        backgroundSyncStatus: 'pending',
        requiresDatabaseUpgrade: true,
      })
    })

    expect(result.current).toMatchObject({
      isConfigured: true,
      syncStatus: 'connected',
      lastSyncTime: '2026-08-04T12:00:00.000Z',
      hasPendingLocalChanges: true,
      requiresDatabaseUpgrade: true,
    })
  })

  it('forwards commands to the deep module', async () => {
    const { result } = renderHook(() =>
      useSupabaseSync({ data: DEFAULT_CHECKLIST_DATA, onDataImport: vi.fn() }),
    )

    await expect(result.current.setupSupabase('project', 'key')).resolves.toEqual({ ok: true })
    await expect(result.current.triggerSync()).resolves.toEqual({ ok: true })
    result.current.clearSyncError()
    result.current.teardownSupabase()

    expect(mockedModule.synchronization.configure).toHaveBeenCalledWith('project', 'key')
    expect(mockedModule.synchronization.syncNow).toHaveBeenCalledOnce()
    expect(mockedModule.synchronization.clearError).toHaveBeenCalledOnce()
    expect(mockedModule.synchronization.disconnect).toHaveBeenCalledOnce()
  })

  it('uses the latest Checklist port and import callback without rebuilding the module', async () => {
    const firstImport = vi.fn()
    const secondImport = vi.fn()
    const firstPort = { applyRemoteSnapshot: vi.fn() } as never
    const secondPort = { applyRemoteSnapshot: vi.fn() } as never
    const { rerender } = renderHook(
      ({ data, onDataImport, syncPort }) => useSupabaseSync({ data, onDataImport, syncPort }),
      {
        initialProps: {
          data: DEFAULT_CHECKLIST_DATA as ChecklistData,
          onDataImport: firstImport,
          syncPort: firstPort,
        },
      },
    )
    const options = vi.mocked(createCloudSynchronization).mock
      .calls[0][0] as CloudSynchronizationOptions

    rerender({
      data: structuredClone(DEFAULT_CHECKLIST_DATA),
      onDataImport: secondImport,
      syncPort: secondPort,
    })
    options.onDataImport(DEFAULT_CHECKLIST_DATA)

    expect(firstImport).not.toHaveBeenCalled()
    expect(secondImport).toHaveBeenCalledWith(DEFAULT_CHECKLIST_DATA)
    expect(options.getChecklistPort()).toBe(secondPort)
    expect(createCloudSynchronization).toHaveBeenCalledOnce()
  })
})
