import type { ChecklistData } from '../types'
import type { ChecklistPendingOperation } from './checklistController'
import { registerAppServiceWorker } from './appServiceWorker'
import { resolveSupabaseUrl, type SupabaseConfig } from './supabase'

const DB_NAME = 'flowboard-background'
const DB_VERSION = 1
const STATE_STORE = 'sync'
const STATE_KEY = 'current'
const SYNC_TAG = 'flowboard-cloud-sync'

export type BackgroundSyncRegistrationState = 'ready' | 'unsupported' | 'blocked'

interface BackgroundSyncPendingChange {
  id: string
  supabaseUrl: string
  publishableKey: string
  data: ChecklistData
  expectedUpdatedAt: string | null
  operationVersion: number
  operations: ChecklistPendingOperation[]
  status: 'pending' | 'conflict'
  queuedAt: string
}

interface BackgroundSyncResult {
  status: 'applied' | 'conflict' | 'error'
  changeId: string
  supabaseUrl?: string
  publishableKey?: string
  updatedAt: string | null
  operationVersion: number
}

interface BackgroundSyncStoredState {
  pending: BackgroundSyncPendingChange | null
  lastResult: BackgroundSyncResult | null
}

interface BackgroundSyncStageInput {
  config: SupabaseConfig
  data: ChecklistData
  expectedUpdatedAt: string | null
  operationVersion: number
  operations: ChecklistPendingOperation[]
}

export interface BackgroundSyncAdapter {
  getRegistrationState: () => Promise<BackgroundSyncRegistrationState>
  subscribeResults: (listener: () => void) => () => void
  load: () => Promise<BackgroundSyncStoredState>
  stage: (
    input: BackgroundSyncStageInput,
  ) => Promise<{ changeId: string; registration: BackgroundSyncRegistrationState }>
  acknowledge: (changeId: string, updatedAt: string) => Promise<boolean>
  clearResult: () => Promise<void>
  clear: () => Promise<void>
}

const emptyState = (): BackgroundSyncStoredState => ({ pending: null, lastResult: null })

export function createBrowserBackgroundSyncAdapter(): BackgroundSyncAdapter {
  const enqueueStateOperation = createStateOperationQueue()

  return {
    getRegistrationState: detectBackgroundSyncRegistration,
    subscribeResults: subscribeToResults,
    load: () => enqueueStateOperation(readState),
    stage: (input) =>
      enqueueStateOperation(async () => {
        const { config, data, expectedUpdatedAt, operationVersion, operations } = input
        const changeId = createChangeId()
        const registration = await registerBackgroundSync()
        if (registration !== 'ready') return { changeId, registration }

        await writeState({
          pending: {
            id: changeId,
            supabaseUrl: resolveSupabaseUrl(config.projectId),
            publishableKey: config.anonKey,
            data: structuredClone(data),
            expectedUpdatedAt,
            operationVersion,
            operations: structuredClone(operations),
            status: 'pending',
            queuedAt: new Date().toISOString(),
          },
          lastResult: null,
        })
        return { changeId, registration }
      }),
    acknowledge: (changeId, updatedAt) =>
      enqueueStateOperation(async () => {
        const database = await openDatabase()
        return new Promise((resolve, reject) => {
          const transaction = database.transaction(STATE_STORE, 'readwrite')
          const store = transaction.objectStore(STATE_STORE)
          const request = store.get(STATE_KEY)
          let hasPending = false
          request.onsuccess = () => {
            const state = normalizeState(request.result)
            if (state.pending?.id === changeId) {
              state.pending = null
            } else if (state.pending) {
              state.pending.expectedUpdatedAt = updatedAt
              state.pending.status = 'pending'
              hasPending = true
            }
            state.lastResult = null
            store.put(state, STATE_KEY)
          }
          request.onerror = () => reject(request.error)
          transaction.oncomplete = () => resolve(hasPending)
          transaction.onerror = () => reject(transaction.error)
        })
      }),
    clearResult: () =>
      enqueueStateOperation(async () => {
        const state = await readState()
        if (!state.lastResult) return
        await writeState({ ...state, lastResult: null })
      }),
    clear: () => enqueueStateOperation(clearState),
  }
}

async function registerBackgroundSync(): Promise<BackgroundSyncRegistrationState> {
  try {
    const registration = await getSyncRegistration()
    if (!registration.sync) return 'unsupported'
    await registration.sync.register(SYNC_TAG)
    return 'ready'
  } catch {
    return 'blocked'
  }
}

function subscribeToResults(listener: () => void): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => undefined
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'flowboard-background-sync-result') listener()
  }
  navigator.serviceWorker.addEventListener('message', handleMessage)
  return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
}

function createStateOperationQueue() {
  let tail = Promise.resolve()

  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation)
    tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

async function detectBackgroundSyncRegistration(): Promise<BackgroundSyncRegistrationState> {
  try {
    const registration = await getSyncRegistration()
    return registration.sync ? 'ready' : 'unsupported'
  } catch {
    return 'blocked'
  }
}

async function getSyncRegistration(): Promise<
  ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }
> {
  return (await registerAppServiceWorker()) as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> }
  }
}

function createChangeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeState(value: unknown): BackgroundSyncStoredState {
  if (!value || typeof value !== 'object') return emptyState()
  const state = value as Partial<BackgroundSyncStoredState>
  return {
    pending: state.pending ?? null,
    lastResult: state.lastResult ?? null,
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STATE_STORE)) {
        request.result.createObjectStore(STATE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readState(): Promise<BackgroundSyncStoredState> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(STATE_STORE).objectStore(STATE_STORE).get(STATE_KEY)
    request.onsuccess = () => resolve(normalizeState(request.result))
    request.onerror = () => reject(request.error)
  })
}

async function writeState(state: BackgroundSyncStoredState): Promise<void> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STATE_STORE, 'readwrite')
      .objectStore(STATE_STORE)
      .put(state, STATE_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearState(): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STATE_STORE, 'readwrite').objectStore(STATE_STORE).clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
