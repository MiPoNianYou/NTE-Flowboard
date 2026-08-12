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
import { SyncError } from '../../src/utils/supabase'
import type { CloudSyncState } from '../../src/utils/supabase'

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
  initialState: CloudSyncState | null = initialConfig
    ? { projectId: initialConfig.projectId, lastSeenAt: null, lastSuccessfulSyncAt: null }
    : null,
): CloudSynchronizationMetadataAdapter {
  let storedConfig = initialConfig
  let syncState = initialState
  return {
    loadConfig: vi.fn(() => storedConfig),
    saveConfig: vi.fn((next) => {
      storedConfig = next
    }),
    clearConfig: vi.fn(() => {
      storedConfig = null
      syncState = null
    }),
    loadSyncState: vi.fn(() => syncState),
    saveSyncState: vi.fn((value) => {
      syncState = value
      return true
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
          supabaseUrl: 'https://project.supabase.co',
          publishableKey: 'key',
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

  it('does not consume a background result from another project', async () => {
    const background = createBackground({
      load: vi.fn(async () => ({
        pending: null,
        lastResult: {
          status: 'applied' as const,
          changeId: 'other-project-change',
          supabaseUrl: 'https://other-project.supabase.co',
          publishableKey: 'other-key',
          updatedAt: '2026-08-04T13:00:00.000Z',
          operationVersion: 2,
        },
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
    await vi.advanceTimersByTimeAsync(0)

    expect(port.acknowledgeOperationsThrough).not.toHaveBeenCalled()
    expect(background.clearResult).not.toHaveBeenCalled()
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

  it('clears sync state when configure switches to another project', async () => {
    const metadata = createMetadata()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote: createRemote(),
      metadata,
      runtime: createRuntime().runtime,
    })

    await synchronization.configure('other-project', 'new-key')

    expect(metadata.saveSyncState).toHaveBeenCalledWith({
      projectId: 'other-project',
      lastSeenAt: null,
      lastSuccessfulSyncAt: null,
    })
  })

  it('preserves sync state when configure uses the same canonical project', async () => {
    const initialState: CloudSyncState = {
      projectId: 'project',
      lastSeenAt: '2026-08-04T11:00:00.123456Z',
      lastSuccessfulSyncAt: '2026-08-04T11:01:00.000Z',
    }
    const metadata = createMetadata(config, initialState)
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote: createRemote(),
      metadata,
      runtime: createRuntime().runtime,
    })

    await synchronization.configure('https://project.supabase.co/', 'new-key')

    expect(metadata.saveSyncState).toHaveBeenCalledWith({
      projectId: 'https://project.supabase.co/',
      lastSeenAt: initialState.lastSeenAt,
      lastSuccessfulSyncAt: initialState.lastSuccessfulSyncAt,
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

  it('does not retry a remote success when local state persistence fails', async () => {
    const metadata = createMetadata()
    vi.spyOn(metadata, 'saveSyncState').mockReturnValue(false)
    const remote = createRemote()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => undefined,
      onDataImport: vi.fn(),
      remote,
      metadata,
      runtime: createRuntime().runtime,
      background: createBackground(),
    })
    const result = await synchronization.syncNow()

    expect(result).toEqual({ ok: true })
    expect(remote.push).toHaveBeenCalledOnce()
    expect(synchronization.getSnapshot()).toMatchObject({
      syncStatus: 'connected',
      syncError: null,
    })
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

  it('uses the legacy foreground writer when conditional writes are known to be unavailable', async () => {
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

    expect(remote.push).toHaveBeenCalledWith(config, expect.any(Object))
    expect(synchronization.getSnapshot()).toMatchObject({
      hasPendingLocalChanges: false,
      backgroundSyncStatus: 'upgrade-required',
      requiresDatabaseUpgrade: true,
    })
  })

  it('does not stage service-worker work while a database upgrade is required', async () => {
    const remote = createRemote({ supportsConditionalWrite: vi.fn(async () => false) })
    const background = createBackground()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => createPort(),
      onDataImport: vi.fn(),
      remote,
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.updateLocalData(remoteData)
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)

    expect(background.stage).not.toHaveBeenCalled()
  })

  it('stops retrying the legacy writer after the old RPC is confirmed missing', async () => {
    const remote = createRemote({
      supportsConditionalWrite: vi.fn(async () => false),
      push: vi.fn(async () => {
        throw new SyncError('Could not find upsert_sync', 'PGRST202')
      }),
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
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)
    const result = await synchronization.syncNow()

    expect(remote.push).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: false, error: '需要先升级同步数据库' })
    expect(synchronization.getSnapshot()).toMatchObject({
      syncStatus: 'connected',
      hasPendingLocalChanges: true,
      backgroundSyncStatus: 'upgrade-required',
    })
  })

  it('keeps an unavailable legacy writer locked after a later capability probe fails', async () => {
    const capabilityProbe = vi
      .fn<CloudSynchronizationRemoteAdapter['supportsConditionalWrite']>()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('capability probe failed'))
      .mockResolvedValue(false)
    const remote = createRemote({
      supportsConditionalWrite: capabilityProbe,
      push: vi.fn(async () => {
        throw new SyncError('Could not find upsert_sync', 'PGRST202')
      }),
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
    await synchronization.syncNow()
    await synchronization.syncNow()
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)

    expect(remote.push).toHaveBeenCalledOnce()
    expect(synchronization.getSnapshot().backgroundSyncStatus).toBe('upgrade-required')
  })

  it('waits for an online capability probe before retrying a legacy write', async () => {
    const deferredProbe = createDeferred<boolean>()
    const capabilityProbe = vi
      .fn<CloudSynchronizationRemoteAdapter['supportsConditionalWrite']>()
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(deferredProbe.promise)
    const remote = createRemote({ supportsConditionalWrite: capabilityProbe })
    const runtime = createRuntime()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => createPort(),
      onDataImport: vi.fn(),
      remote,
      background: createBackground(),
      metadata: createMetadata(),
      runtime: runtime.runtime,
    })

    synchronization.updateLocalData(remoteData)
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)
    vi.mocked(remote.push).mockClear()
    synchronization.updateLocalData(structuredClone(remoteData))

    runtime.triggerOnline()
    await Promise.resolve()

    expect(remote.push).not.toHaveBeenCalled()
    deferredProbe.resolve(false)
    await vi.advanceTimersByTimeAsync(0)

    expect(remote.push).toHaveBeenCalledWith(config, expect.any(Object))
  })

  it('does not reuse an in-flight capability probe after switching projects', async () => {
    const oldProjectProbe = createDeferred<boolean>()
    const capabilityProbe = vi
      .fn<CloudSynchronizationRemoteAdapter['supportsConditionalWrite']>()
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(oldProjectProbe.promise)
      .mockResolvedValueOnce(false)
    const remote = createRemote({ supportsConditionalWrite: capabilityProbe })
    const runtime = createRuntime()
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => createPort(),
      onDataImport: vi.fn(),
      remote,
      background: createBackground(),
      metadata: createMetadata(),
      runtime: runtime.runtime,
    })

    synchronization.updateLocalData(remoteData)
    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    runtime.triggerOnline()
    await Promise.resolve()

    const configurePromise = synchronization.configure('other-project', 'other-key')
    await Promise.resolve()

    expect(capabilityProbe).toHaveBeenCalledWith({
      projectId: 'other-project',
      anonKey: 'other-key',
    })

    oldProjectProbe.resolve(true)
    await configurePromise
  })

  it('keeps foreground writes disabled when capability probing cannot be verified', async () => {
    const remote = createRemote({
      supportsConditionalWrite: vi.fn(async () => {
        throw new Error('capability probe failed')
      }),
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
      backgroundSyncStatus: 'capability-unknown',
      requiresDatabaseUpgrade: false,
    })
  })

  it('rehydrates queued operations before requiring a database upgrade', async () => {
    const operations = [
      {
        version: 4,
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
          id: 'pending-legacy',
          supabaseUrl: 'https://project.supabase.co',
          publishableKey: 'key',
          data: remoteData,
          expectedUpdatedAt: null,
          operationVersion: 4,
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
      remote: createRemote({ supportsConditionalWrite: vi.fn(async () => false) }),
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(port.restorePendingOperations).toHaveBeenCalledWith(operations)
    expect(background.clear).toHaveBeenCalledOnce()
    expect(synchronization.getSnapshot().backgroundSyncStatus).toBe('upgrade-required')
  })

  it('preserves a different project queue without restoring or overwriting it', async () => {
    const operations = [
      {
        version: 4,
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
          id: 'other-project',
          supabaseUrl: 'https://other-project.supabase.co',
          publishableKey: 'other-key',
          data: remoteData,
          expectedUpdatedAt: null,
          operationVersion: 4,
          operations,
          status: 'pending' as const,
          queuedAt: '2026-08-04T12:00:00.000Z',
        },
        lastResult: null,
      })),
    })
    const port = createPort()
    const remote = createRemote({ supportsConditionalWrite: vi.fn(async () => false) })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => port,
      onDataImport: vi.fn(),
      remote,
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)

    expect(port.restorePendingOperations).not.toHaveBeenCalled()
    expect(background.clear).not.toHaveBeenCalled()
    expect(background.stage).not.toHaveBeenCalled()
    expect(remote.push).not.toHaveBeenCalled()
    expect(synchronization.getSnapshot().backgroundSyncStatus).toBe('preserved-other-project')
  })

  it('preserves a matching queue without operations until the database is upgraded', async () => {
    const background = createBackground({
      load: vi.fn(async () => ({
        pending: {
          id: 'snapshot-only',
          supabaseUrl: 'https://project.supabase.co',
          publishableKey: 'key',
          data: remoteData,
          expectedUpdatedAt: null,
          operationVersion: 4,
          operations: [],
          status: 'pending' as const,
          queuedAt: '2026-08-04T12:00:00.000Z',
        },
        lastResult: null,
      })),
    })
    const remote = createRemote({ supportsConditionalWrite: vi.fn(async () => false) })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => createPort(),
      onDataImport: vi.fn(),
      remote,
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    synchronization.updateLocalData(structuredClone(remoteData))
    await vi.advanceTimersByTimeAsync(MS.PUSH_DEBOUNCE)

    expect(background.clear).not.toHaveBeenCalled()
    expect(background.stage).not.toHaveBeenCalled()
    expect(remote.push).not.toHaveBeenCalled()
    expect(synchronization.getSnapshot().backgroundSyncStatus).toBe('preserved-pending')
    expect(synchronization.getSnapshot().requiresDatabaseUpgrade).toBe(true)
  })

  it('keeps a preserved background queue when cloud sync is disconnected', async () => {
    const background = createBackground({
      load: vi.fn(async () => ({
        pending: {
          id: 'other-project',
          supabaseUrl: 'https://other-project.supabase.co',
          publishableKey: 'other-key',
          data: remoteData,
          expectedUpdatedAt: null,
          operationVersion: 4,
          operations: [],
          status: 'pending' as const,
          queuedAt: '2026-08-04T12:00:00.000Z',
        },
        lastResult: null,
      })),
    })
    const synchronization = createCloudSynchronization({
      initialData: remoteData,
      getChecklistPort: () => createPort(),
      onDataImport: vi.fn(),
      remote: createRemote(),
      background,
      metadata: createMetadata(),
      runtime: createRuntime().runtime,
    })

    synchronization.start()
    await vi.advanceTimersByTimeAsync(0)
    synchronization.disconnect()

    expect(background.clear).not.toHaveBeenCalled()
    expect(synchronization.getSnapshot().backgroundSyncStatus).toBe('inactive')
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
