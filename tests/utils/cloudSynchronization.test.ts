import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistData } from '../../src/types'
import {
  createCloudSynchronization,
  type CloudSynchronizationMetadataAdapter,
  type CloudSynchronizationRemoteAdapter,
  type CloudSynchronizationRuntime,
} from '../../src/utils/cloudSynchronization'
import type { ChecklistSynchronizationPort } from '../../src/utils/checklistController'
import { DEFAULT_CHECKLIST_DATA } from '../../src/utils/defaultData'
import { MS } from '../../src/utils/constants'
import type { BackgroundSyncAdapter } from '../../src/utils/backgroundSync'

const config = { projectId: 'project', anonKey: 'key' }
const remoteData: ChecklistData = {
  ...structuredClone(DEFAULT_CHECKLIST_DATA),
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
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

function createMetadata(
  initialConfig: typeof config | null = config,
): CloudSynchronizationMetadataAdapter {
  let storedConfig = initialConfig
  let lastSyncTime: string | null = null
  let lastSeenTime: string | null = null
  return {
    loadConfig: vi.fn(() => storedConfig),
    saveConfig: vi.fn((next) => {
      storedConfig = next
    }),
    clearConfig: vi.fn(() => {
      storedConfig = null
      lastSyncTime = null
      lastSeenTime = null
    }),
    loadLastSyncTime: vi.fn(() => lastSyncTime),
    saveLastSyncTime: vi.fn((value) => {
      lastSyncTime = value
    }),
    loadLastSeenTime: vi.fn(() => lastSeenTime),
    saveLastSeenTime: vi.fn((value) => {
      lastSeenTime = value
    }),
  }
}

function createRuntime() {
  let online: (() => void) | null = null
  let visibility: (() => void) | null = null
  let crossTab: (() => void) | null = null
  let hidden = false
  const runtime: CloudSynchronizationRuntime = {
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
    setInterval: (callback, delay) => setInterval(callback, delay),
    clearInterval: (timer) => clearInterval(timer),
    isDocumentHidden: () => hidden,
    subscribeOnline: (listener) => {
      online = listener
      return () => {
        online = null
      }
    },
    subscribeVisibility: (listener) => {
      visibility = listener
      return () => {
        visibility = null
      }
    },
    subscribeCrossTab: (listener) => {
      crossTab = listener
      return () => {
        crossTab = null
      }
    },
    broadcast: vi.fn(),
    now: () => new Date('2026-08-04T12:00:00.000Z'),
  }
  return {
    runtime,
    triggerOnline: () => online?.(),
    triggerCrossTab: () => crossTab?.(),
    setHidden: (value: boolean) => {
      hidden = value
      visibility?.()
    },
  }
}

function createRemote(
  overrides: Partial<CloudSynchronizationRemoteAdapter> = {},
): CloudSynchronizationRemoteAdapter {
  return {
    validate: vi.fn(async () => ({ ok: true as const })),
    supportsConditionalWrite: vi.fn(async () => true),
    pull: vi.fn(async () => null),
    push: vi.fn(async () => ({
      outcome: 'applied' as const,
      updatedAt: '2026-08-04T12:00:00.000Z',
    })),
    subscribe: vi.fn(() => () => undefined),
    reset: vi.fn(),
    classifyError: vi.fn((error) => (error instanceof Error ? error.message : String(error))),
    isRetryableError: vi.fn(() => true),
    ...overrides,
  }
}

function createPort(
  overrides: Partial<ChecklistSynchronizationPort> = {},
): ChecklistSynchronizationPort {
  return {
    applyRemoteSnapshot: vi.fn(async () => ({ outcome: 'applied' as const, skippedOperations: 0 })),
    captureSnapshot: vi.fn(() => ({ data: remoteData, operationVersion: 1, operations: [] })),
    acknowledgeOperationsThrough: vi.fn(),
    restorePendingOperations: vi.fn(),
    ...overrides,
  }
}

function createBackground(overrides: Partial<BackgroundSyncAdapter> = {}): BackgroundSyncAdapter {
  return {
    getRegistrationState: vi.fn(async () => 'ready' as const),
    subscribeResults: vi.fn(() => () => undefined),
    load: vi.fn(async () => ({ pending: null, lastResult: null })),
    stage: vi.fn(async () => ({
      changeId: crypto.randomUUID(),
      registration: 'ready' as const,
    })),
    acknowledge: vi.fn(async () => false),
    clearResult: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('createCloudSynchronization', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('starts from stored config and pulls after validation', async () => {
    const remote = createRemote()
    const runtime = createRuntime()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote,
      metadata: createMetadata(),
      runtime: runtime.runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(remote.validate).toHaveBeenCalledWith('project', 'key')
    expect(remote.pull).toHaveBeenCalledOnce()
    expect(synchronization.getSnapshot().syncStatus).toBe('connected')
  })

  it('cancels stale validation when synchronization restarts', async () => {
    const operations = [
      {
        version: 2,
        transition: {
          kind: 'set-item-completed' as const,
          cycle: 'daily' as const,
          id: 'remote',
          isCompleted: true,
        },
      },
    ]
    const background = createBackground({
      load: vi.fn(async () => ({
        pending: {
          id: 'pending-1',
          supabaseUrl: 'https://project.supabase.co',
          publishableKey: 'key',
          data: remoteData,
          expectedUpdatedAt: null,
          operationVersion: 2,
          operations,
          status: 'pending' as const,
          queuedAt: '2026-08-04T12:00:00.000Z',
        },
        lastResult: null,
      })),
    })
    const port = createPort()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => port,
      onDataImport: vi.fn(),
      remote: createRemote(),
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    synchronization.stop()
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(port.restorePendingOperations).toHaveBeenCalledOnce()
    synchronization.stop()
  })

  it('hydrates and acknowledges a background sync result sent to an open page', async () => {
    let notifyResult: (() => void) | undefined
    const load = vi
      .fn()
      .mockResolvedValueOnce({ pending: null, lastResult: null })
      .mockResolvedValueOnce({
        pending: null,
        lastResult: {
          status: 'applied' as const,
          changeId: 'pending-1',
          updatedAt: '2026-08-04T13:00:00.000Z',
          operationVersion: 2,
        },
      })
    const background = createBackground({
      load,
      subscribeResults: vi.fn((listener) => {
        notifyResult = listener
        return () => undefined
      }),
    })
    const port = createPort()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => port,
      onDataImport: vi.fn(),
      remote: createRemote(),
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    notifyResult?.()
    for (let index = 0; index < 5; index += 1) await Promise.resolve()

    expect(port.acknowledgeOperationsThrough).toHaveBeenCalledWith(2)
    expect(background.clearResult).toHaveBeenCalledOnce()
    expect(synchronization.getSnapshot()).toMatchObject({
      hasPendingLocalChanges: false,
      backgroundSyncStatus: 'ready',
    })
    synchronization.stop()
  })

  it('returns the validation result from configure', async () => {
    const remote = createRemote({
      validate: vi.fn(async () => ({ ok: false, reason: 'auth' as const })),
    })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote,
      metadata: createMetadata(null),
      runtime: createRuntime().runtime,
    })

    const result = await synchronization.configure('bad', 'bad')

    expect(result).toEqual({ ok: false, error: expect.any(String) })
    expect(synchronization.getSnapshot()).toMatchObject({
      isConfigured: false,
      syncStatus: 'disconnected',
    })
  })

  it('applies remote data through the Checklist controller seam and pushes a merge', async () => {
    const mergedData = {
      ...remoteData,
      daily: [{ ...remoteData.daily[0], text: 'Merged task' }],
    }
    const port = createPort({
      applyRemoteSnapshot: vi.fn(async () => ({
        outcome: 'merged' as const,
        skippedOperations: 0,
      })),
      captureSnapshot: vi.fn(() => ({ data: mergedData, operationVersion: 4, operations: [] })),
    })
    const remote = createRemote({
      pull: vi.fn(async () => ({
        data: remoteData,
        updatedAt: '2026-08-04T11:00:00.000Z',
      })),
    })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => port,
      onDataImport: vi.fn(),
      remote,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(port.applyRemoteSnapshot).toHaveBeenCalledWith(remoteData)
    expect(remote.push).toHaveBeenCalledWith(
      config,
      expect.objectContaining({ daily: mergedData.daily }),
      { expectedUpdatedAt: '2026-08-04T11:00:00.000Z' },
    )
    expect(port.acknowledgeOperationsThrough).toHaveBeenCalledWith(4)
  })

  it('coalesces a local change during a pull into one follow-up push', async () => {
    const pull = createDeferred<null>()
    const remote = createRemote({
      pull: vi.fn(() => pull.promise),
    })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })
    synchronization.updateLocalData(remoteData)
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)

    const changed = structuredClone(remoteData)
    changed.daily[0].text = 'Local edit'
    synchronization.updateLocalData(changed)
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)
    pull.resolve(null)
    for (let index = 0; index < 10; index += 1) await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)

    expect(remote.pull).toHaveBeenCalledOnce()
    expect(remote.push).toHaveBeenCalledOnce()
    synchronization.stop()
  })

  it('retries transient failures but leaves terminal failures idle', async () => {
    const transient = new Error('offline')
    const transientRemote = createRemote({
      pull: vi.fn().mockRejectedValueOnce(transient).mockResolvedValue(null),
    })
    const transientSync = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote: transientRemote,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })
    transientSync.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(MS.ERROR_RECOVERY)
    expect(transientRemote.pull).toHaveBeenCalledTimes(2)

    const terminalRemote = createRemote({
      pull: vi.fn(async () => {
        throw new Error('permission denied')
      }),
      isRetryableError: vi.fn(() => false),
    })
    const terminalSync = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote: terminalRemote,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })
    terminalSync.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(MS.ERROR_RECOVERY * 2)
    expect(terminalRemote.pull).toHaveBeenCalledOnce()
  })

  it('invalidates an in-flight pull when disconnected', async () => {
    const pull = createDeferred<{ data: ChecklistData; updatedAt: string }>()
    const onDataImport = vi.fn()
    const remote = createRemote({
      pull: vi.fn(() => pull.promise),
    })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport,
      remote,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)

    synchronization.disconnect()
    pull.resolve({ data: remoteData, updatedAt: '2026-08-04T13:00:00.000Z' })
    await Promise.resolve()

    expect(onDataImport).not.toHaveBeenCalled()
    expect(synchronization.getSnapshot().syncStatus).toBe('disconnected')
  })

  it('routes online and cross-tab events through the same synchronization queue', async () => {
    const remote = createRemote()
    const runtime = createRuntime()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote,
      metadata: createMetadata(),
      runtime: runtime.runtime,
    })
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    vi.mocked(remote.pull).mockClear()

    runtime.triggerOnline()
    runtime.triggerCrossTab()
    await Promise.resolve()
    await Promise.resolve()

    expect(remote.pull).toHaveBeenCalledOnce()
  })

  it('persists the latest local change immediately when safe background sync is available', async () => {
    const remote = createRemote({
      supportsConditionalWrite: vi.fn(async () => true),
    })
    const background = createBackground()
    const port = createPort()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => port,
      onDataImport: vi.fn(),
      remote,
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.updateLocalData(remoteData)
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    const changed = structuredClone(remoteData)
    changed.daily[0].text = 'Persist before debounce'
    vi.mocked(port.captureSnapshot).mockReturnValue({
      data: changed,
      operationVersion: 2,
      operations: [
        {
          version: 2,
          transition: {
            kind: 'edit-item',
            cycle: 'daily',
            id: 'remote',
            text: 'Persist before debounce',
            tags: [],
          },
        },
      ],
    })

    synchronization.updateLocalData(changed)
    await Promise.resolve()
    await Promise.resolve()

    expect(background.stage).toHaveBeenCalledWith(
      expect.objectContaining({
        config,
        data: changed,
        expectedUpdatedAt: null,
        operationVersion: 2,
      }),
    )
    expect(synchronization.getSnapshot()).toMatchObject({
      hasPendingLocalChanges: true,
      backgroundSyncStatus: 'pending',
    })
  })

  it('never falls back to an unconditional write when the database needs upgrading', async () => {
    const remote = createRemote({
      supportsConditionalWrite: vi.fn(async () => false),
    })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => createPort(),
      onDataImport: vi.fn(),
      remote,
      background: createBackground(),
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.updateLocalData(remoteData)
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)

    expect(remote.push).not.toHaveBeenCalled()
    expect(synchronization.getSnapshot()).toMatchObject({
      hasPendingLocalChanges: true,
      backgroundSyncStatus: 'upgrade-required',
    })
  })

  it('pulls and retries a conditional write conflict instead of overwriting cloud data', async () => {
    const newerRemote = {
      ...remoteData,
      daily: [{ ...remoteData.daily[0], text: 'Other device edit' }],
    }
    const remote = createRemote({
      supportsConditionalWrite: vi.fn(async () => true),
      pull: vi
        .fn()
        .mockResolvedValueOnce({ data: remoteData, updatedAt: '2026-08-04T11:00:00.000Z' })
        .mockResolvedValueOnce({ data: newerRemote, updatedAt: '2026-08-04T12:00:00.000Z' }),
      push: vi
        .fn()
        .mockResolvedValueOnce({
          outcome: 'conflict',
          updatedAt: '2026-08-04T12:00:00.000Z',
        })
        .mockResolvedValueOnce({
          outcome: 'applied',
          updatedAt: '2026-08-04T13:00:00.000Z',
        }),
    })
    const port = createPort({
      applyRemoteSnapshot: vi.fn(async () => ({
        outcome: 'merged' as const,
        skippedOperations: 0,
      })),
    })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => port,
      onDataImport: vi.fn(),
      remote,
      background: createBackground(),
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.updateLocalData(remoteData)
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)

    expect(remote.push).toHaveBeenNthCalledWith(1, config, expect.any(Object), {
      expectedUpdatedAt: '2026-08-04T11:00:00.000Z',
    })
    expect(port.applyRemoteSnapshot).toHaveBeenLastCalledWith(newerRemote)
    expect(remote.push).toHaveBeenNthCalledWith(2, config, expect.any(Object), {
      expectedUpdatedAt: '2026-08-04T12:00:00.000Z',
    })
  })

  it('restores persisted operations before resolving a background conflict', async () => {
    const operations = [
      {
        version: 3,
        transition: {
          kind: 'set-item-completed' as const,
          cycle: 'daily' as const,
          id: 'remote',
          isCompleted: true,
        },
      },
    ]
    const background = createBackground({
      load: vi.fn(async () => ({
        pending: {
          id: 'pending-1',
          supabaseUrl: 'https://project.supabase.co',
          publishableKey: 'key',
          data: remoteData,
          expectedUpdatedAt: '2026-08-04T11:00:00.000Z',
          operationVersion: 3,
          operations,
          status: 'conflict' as const,
          queuedAt: '2026-08-04T12:00:00.000Z',
        },
        lastResult: null,
      })),
    })
    const port = createPort()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => port,
      onDataImport: vi.fn(),
      remote: createRemote({ supportsConditionalWrite: vi.fn(async () => true) }),
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(port.restorePendingOperations).toHaveBeenCalledWith(operations)
  })

  it('clears persisted background work when cloud sync is disconnected', () => {
    const background = createBackground()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote: createRemote(),
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.disconnect()

    expect(background.clear).toHaveBeenCalledOnce()
    expect(synchronization.getSnapshot().backgroundSyncStatus).toBe('inactive')
  })
})
