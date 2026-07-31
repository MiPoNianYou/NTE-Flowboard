import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistData, SyncStatus } from '../../src/types'
import { createSyncSession, type SyncSessionOptions } from '../../src/utils/syncSession'

const config = { projectId: 'project', anonKey: 'key' }
const remoteData: ChecklistData = {
  daily: [
    {
      id: 'remote',
      text: 'Remote task',
      isCompleted: false,
      isHidden: false,
      order: 1,
      tags: [],
    },
  ],
  weekly: [],
  monthly: [],
  lastDailyReset: '2026-07-01T00:00:00.000Z',
  lastWeeklyReset: '2026-07-01T00:00:00.000Z',
  lastMonthlyReset: '2026-07-01T00:00:00.000Z',
  settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  uiPreferences: { cloudPatchHidden: false },
}

function createOptions(overrides: Partial<SyncSessionOptions> = {}) {
  const statuses: SyncStatus[] = []
  const options: SyncSessionOptions = {
    config,
    initialLastSeenTime: null,
    pullRemote: vi.fn(async () => ({
      data: remoteData,
      updatedAt: '2026-07-01T01:00:00.000Z',
    })),
    pushRemote: vi.fn(async () => '2026-07-01T02:00:00.000Z'),
    onDataImport: vi.fn(),
    onRemoteApplied: vi.fn(),
    onLastSeen: vi.fn(),
    onStatus: vi.fn((status) => statuses.push(status)),
    onError: vi.fn(),
    onClearError: vi.fn(),
    onRetry: vi.fn(),
    resetRetries: vi.fn(),
    broadcast: vi.fn(),
    ...overrides,
  }
  return { options, statuses }
}

describe('createSyncSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies a newer remote snapshot through the sync port', async () => {
    const applyExternalSnapshot = vi.fn(async () => ({
      outcome: 'applied' as const,
      skippedOperations: 0,
    }))
    const { options } = createOptions({
      syncPort: {
        applyExternalSnapshot,
        captureSnapshot: vi.fn(() => ({ data: remoteData, operationVersion: 0 })),
        acknowledgeOperationsThrough: vi.fn(),
      },
    })
    const session = createSyncSession(options)

    await expect(session.pull(true)).resolves.toEqual({ imported: true, merged: false })

    expect(applyExternalSnapshot).toHaveBeenCalledWith({
      data: remoteData,
      revision: { counter: Date.parse('2026-07-01T01:00:00.000Z'), writerId: 'supabase' },
    })
    expect(options.onDataImport).not.toHaveBeenCalled()
    expect(options.onRemoteApplied).toHaveBeenCalled()
    expect(options.onClearError).toHaveBeenCalled()
  })

  it('pushes the merged snapshot back to the remote store', async () => {
    const mergedData = {
      ...remoteData,
      daily: [{ ...remoteData.daily[0], text: 'Merged task' }],
    }
    const { options } = createOptions({
      syncPort: {
        applyExternalSnapshot: vi.fn(async () => ({
          outcome: 'merged' as const,
          skippedOperations: 0,
        })),
        captureSnapshot: vi.fn(() => ({ data: mergedData, operationVersion: 0 })),
        acknowledgeOperationsThrough: vi.fn(),
      },
    })
    const session = createSyncSession(options)

    await expect(session.pull(true)).resolves.toEqual({ imported: true, merged: true })

    expect(options.pushRemote).toHaveBeenCalledWith(config, mergedData)
    expect(options.broadcast).toHaveBeenCalledWith('2026-07-01T02:00:00.000Z')
  })

  it('schedules local pushes only after initialization and connection', async () => {
    const { options } = createOptions({ pullRemote: vi.fn(async () => null) })
    const session = createSyncSession(options)

    expect(session.markLocalChange()).toBe(false)
    await session.pull(true)
    expect(session.markLocalChange()).toBe(true)
  })

  it('schedules a retry when pulling fails', async () => {
    const failure = new Error('offline')
    const { options, statuses } = createOptions({
      pullRemote: vi.fn(async () => {
        throw failure
      }),
    })
    const session = createSyncSession(options)

    await expect(session.pull(true)).resolves.toEqual({ imported: false, merged: false })

    expect(options.onError).toHaveBeenCalledWith(failure)
    expect(options.onRetry).toHaveBeenCalledWith('pull')
    expect(statuses[statuses.length - 1]).toBe('error')
  })

  it('broadcasts and clears errors after a successful push', async () => {
    const { options } = createOptions()
    const session = createSyncSession(options)

    await session.push(remoteData)

    expect(options.onLastSeen).toHaveBeenCalledWith('2026-07-01T02:00:00.000Z')
    expect(options.onClearError).toHaveBeenCalled()
    expect(options.broadcast).toHaveBeenCalledWith('2026-07-01T02:00:00.000Z')
    expect(session.getState().syncStatus).toBe('connected')
  })

  it('remains disconnected when sync is requested without a config', async () => {
    const { options, statuses } = createOptions({ config: null })
    const session = createSyncSession(options)

    await expect(session.pull(true)).resolves.toEqual({ imported: false, merged: false })
    await session.push(remoteData)

    expect(options.pullRemote).not.toHaveBeenCalled()
    expect(options.pushRemote).not.toHaveBeenCalled()
    expect(statuses).toEqual([])
    expect(session.getState().syncStatus).toBe('disconnected')
  })

  it('keeps the push failure visible after a merged pull', async () => {
    const failure = new Error('push failed')
    const { options } = createOptions({
      pushRemote: vi.fn(async () => {
        throw failure
      }),
      syncPort: {
        applyExternalSnapshot: vi.fn(async () => ({
          outcome: 'merged' as const,
          skippedOperations: 0,
        })),
        captureSnapshot: vi.fn(() => ({ data: remoteData, operationVersion: 0 })),
        acknowledgeOperationsThrough: vi.fn(),
      },
    })
    const session = createSyncSession(options)

    await expect(session.pull(true)).resolves.toEqual({ imported: true, merged: true })

    expect(options.onError).toHaveBeenCalledWith(failure)
    expect(options.onClearError).not.toHaveBeenCalled()
    expect(session.getState().syncStatus).toBe('error')
  })

  it('resets the seen cursor when switching configured projects', async () => {
    const { options } = createOptions({ initialLastSeenTime: '2026-07-02T00:00:00.000Z' })
    const session = createSyncSession(options)
    session.setConfig({ projectId: 'other', anonKey: 'other-key' })

    expect(session.getState().lastSeenTime).toBeNull()
    expect(session.getState().hasLocalChanges).toBe(false)
  })
})
