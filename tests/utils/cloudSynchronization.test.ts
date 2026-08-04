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
    pull: vi.fn(async () => null),
    push: vi.fn(async () => '2026-08-04T12:00:00.000Z'),
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
    captureSnapshot: vi.fn(() => ({ data: remoteData, operationVersion: 1 })),
    acknowledgeOperationsThrough: vi.fn(),
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
      captureSnapshot: vi.fn(() => ({ data: mergedData, operationVersion: 4 })),
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
})
