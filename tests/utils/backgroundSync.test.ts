import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKGROUND_SYNC_PATCH_SQL, CONDITIONAL_SYNC_SQL } from '../../src/utils/cloudSyncSql'
import { createBrowserBackgroundSyncAdapter } from '../../src/utils/backgroundSync'
import { registerAppServiceWorker } from '../../src/utils/appServiceWorker'
import { DEFAULT_CHECKLIST_DATA } from '../../src/utils/defaultData'

vi.mock('../../src/utils/appServiceWorker', () => ({
  registerAppServiceWorker: vi.fn(),
}))

describe('browser background sync adapter', () => {
  let originalIndexedDb: typeof indexedDB | undefined
  let originalDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    originalIndexedDb = globalThis.indexedDB
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
  })

  afterEach(() => {
    if (originalIndexedDb) {
      Object.defineProperty(globalThis, 'indexedDB', {
        configurable: true,
        value: originalIndexedDb,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'indexedDB')
    }
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', originalDescriptor)
    } else {
      Reflect.deleteProperty(navigator, 'serviceWorker')
    }
    vi.clearAllMocks()
  })

  it('does not write credentials when Background Sync is unsupported', async () => {
    vi.mocked(registerAppServiceWorker).mockResolvedValue({} as ServiceWorkerRegistration)
    const open = vi.fn()
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: { open },
    })
    const adapter = createBrowserBackgroundSyncAdapter()

    const result = await adapter.stage({
      config: { projectId: 'project', anonKey: 'publishable-key' },
      data: structuredClone(DEFAULT_CHECKLIST_DATA),
      expectedUpdatedAt: null,
      operationVersion: 1,
      operations: [],
    })

    expect(result.registration).toBe('unsupported')
    expect(open).not.toHaveBeenCalled()
  })

  it('notifies listeners when the service worker reports a result', () => {
    const serviceWorker = new EventTarget()
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    })
    const adapter = createBrowserBackgroundSyncAdapter()
    const listener = vi.fn()
    const unsubscribe = adapter.subscribeResults(listener)

    serviceWorker.dispatchEvent(
      new MessageEvent('message', { data: { type: 'flowboard-background-sync-result' } }),
    )
    serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'other' } }))
    unsubscribe()
    serviceWorker.dispatchEvent(
      new MessageEvent('message', { data: { type: 'flowboard-background-sync-result' } }),
    )

    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps the conditional-write SQL contract available to setup and upgrade flows', () => {
    expect(CONDITIONAL_SYNC_SQL).toContain('upsert_sync_if_unchanged')
    expect(CONDITIONAL_SYNC_SQL).toContain('flowboard_sync_capabilities')
    expect(BACKGROUND_SYNC_PATCH_SQL).toContain('sync_data_set_updated_at')
    expect(BACKGROUND_SYNC_PATCH_SQL).toContain('upsert_sync_if_unchanged')
  })
})
