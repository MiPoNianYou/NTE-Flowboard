import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  clearSyncConfig,
  loadLastSyncTime,
  saveLastSyncTime,
  loadLastSeenTime,
  saveLastSeenTime,
  resetClient,
  SyncError,
  validateConfig,
  pushData,
  pullData,
  subscribeToChanges,
} from '../../src/utils/supabase'
import { createClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'flowboard-cloud-config'
const LAST_SYNC_KEY = 'flowboard-cloud-last-sync'
const LAST_SEEN_KEY = 'flowboard-cloud-last-seen'

const mockRpc = vi.fn()
const mockMaybeSingle = vi.fn()
const mockSubscribe = vi.fn()
const mockOn = vi.fn().mockReturnThis()
const mockChannel = vi.fn().mockReturnValue({ on: mockOn, subscribe: mockSubscribe })
const mockRemoveChannel = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}))

beforeEach(() => {
  localStorage.clear()
  resetClient()
  vi.clearAllMocks()
})

describe('SyncError', () => {
  it('should be an instance of Error', () => {
    const error = new SyncError('test', 'CODE')
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('test')
    expect(error.code).toBe('CODE')
  })
})

describe('loadSupabaseConfig', () => {
  it('should return null when no config stored', () => {
    expect(loadSupabaseConfig()).toBeNull()
  })

  it('should load new format config', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ projectId: 'p1', anonKey: 'k1' }))
    const config = loadSupabaseConfig()
    expect(config).toEqual({ projectId: 'p1', anonKey: 'k1' })
  })

  it.each([
    ['legacy keys', JSON.stringify({ pid: 'legacy-p', key: 'legacy-k' })],
    ['corrupted JSON', '{invalid'],
    ['a primitive', '"string"'],
    ['an empty object', '{}'],
    ['empty legacy fields', JSON.stringify({ pid: '', key: 'k' })],
  ])('should reject %s', (_caseName, storedValue) => {
    localStorage.setItem(CONFIG_KEY, storedValue)
    expect(loadSupabaseConfig()).toBeNull()
  })
})

describe('saveSupabaseConfig', () => {
  it('should save and overwrite the active config', () => {
    saveSupabaseConfig({ projectId: 'p1', anonKey: 'k1' })
    expect(loadSupabaseConfig()).toEqual({ projectId: 'p1', anonKey: 'k1' })

    saveSupabaseConfig({ projectId: 'p2', anonKey: 'k2' })
    expect(loadSupabaseConfig()).toEqual({ projectId: 'p2', anonKey: 'k2' })
  })
})

describe('clearSyncConfig', () => {
  it('should remove all sync-related keys', () => {
    localStorage.setItem(CONFIG_KEY, 'config')
    localStorage.setItem(LAST_SYNC_KEY, 'sync')
    localStorage.setItem(LAST_SEEN_KEY, 'seen')

    clearSyncConfig()

    expect(localStorage.getItem(CONFIG_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBeNull()
  })
})

describe('sync timestamps', () => {
  it.each([
    ['last sync', loadLastSyncTime, saveLastSyncTime],
    ['last seen', loadLastSeenTime, saveLastSeenTime],
  ] as const)('should round-trip %s', (_name, load, save) => {
    expect(load()).toBeNull()
    const time = '2025-01-15T10:00:00Z'
    save(time)
    expect(load()).toBe(time)
  })
})

describe('resetClient', () => {
  it('should reset cached client without throwing', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: null })

    await validateConfig('proj', 'key')
    const callsBefore = (createClient as ReturnType<typeof vi.fn>).mock.calls.length

    resetClient()

    await validateConfig('proj', 'key')
    const callsAfter = (createClient as ReturnType<typeof vi.fn>).mock.calls.length

    expect(callsAfter).toBe(callsBefore + 1)
  })
})

describe('validateConfig', () => {
  it.each([
    ['https://project-ref.supabase.co/', 'https://project-ref.supabase.co'],
    ['project-ref', 'https://project-ref.supabase.co'],
  ])('should resolve %s to endpoint %s', async (project, endpoint) => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: null })

    await validateConfig(project, 'test-key')

    expect(createClient).toHaveBeenCalledWith(endpoint, 'test-key', expect.any(Object))
  })

  it('should return true when RPC succeeds', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: null })
    const result = await validateConfig('test-project', 'test-key')
    expect(result).toEqual({ ok: true })
  })

  it.each(['42883', 'PGRST301'])('should accept bootstrap RPC error %s', async (code) => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: { code, message: 'not found' } })
    await expect(validateConfig('test-project', 'test-key')).resolves.toEqual({ ok: true })
  })

  it('should return false when RPC returns other error', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: { code: '400', message: 'bad request' } })
    const result = await validateConfig('test-project', 'test-key')
    expect(result).toEqual({ ok: false, reason: 'unknown', detail: 'bad request' })
  })

  it('should return false when RPC throws', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockRejectedValue(new Error('network error'))
    const result = await validateConfig('test-project', 'test-key')
    expect(result).toEqual({ ok: false, reason: 'network', detail: 'network error' })
  })
})

describe('pushData', () => {
  it('should return timestamp on success', async () => {
    const timestamp = '2025-01-15T10:00:00Z'
    mockRpc.mockReturnValue({ data: timestamp, error: null })
    const result = await pushData({ projectId: 'p', anonKey: 'k' }, { daily: [] })
    expect(result).toBe(timestamp)
  })

  it('should throw SyncError on RPC error', async () => {
    mockRpc.mockReturnValue({ data: null, error: { message: 'timeout' } })
    await expect(pushData({ projectId: 'p', anonKey: 'k' }, { daily: [] })).rejects.toThrow(
      SyncError,
    )
  })

  it('should throw SyncError when result is not string', async () => {
    mockRpc.mockReturnValue({ data: 123, error: null })
    await expect(pushData({ projectId: 'p', anonKey: 'k' }, { daily: [] })).rejects.toThrow(
      SyncError,
    )
  })
})

describe('pullData', () => {
  const validData = JSON.stringify({
    daily: [],
    weekly: [],
    monthly: [],
    lastDailyReset: '',
    lastWeeklyReset: '',
    lastMonthlyReset: '',
    settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true },
  })

  it('should return parsed data on success', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({
      data: { data: validData, updated_at: '2025-01-15T10:00:00Z' },
      error: null,
    })
    const result = await pullData({ projectId: 'p', anonKey: 'k' })
    expect(result).not.toBeNull()
    expect(result?.data).toBeDefined()
    expect(result?.updatedAt).toBe('2025-01-15T10:00:00Z')
  })

  it.each([
    ['missing row', { data: null, error: { code: 'PGRST116' } }],
    ['null row', { data: null, error: null }],
  ])('should return null for %s', async (_caseName, response) => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue(response)
    await expect(pullData({ projectId: 'p', anonKey: 'k' })).resolves.toBeNull()
  })

  it.each([
    ['RPC failure', { data: null, error: { code: '500', message: 'server error' } }],
    [
      'invalid JSON',
      { data: { data: 'not-json', updated_at: '2025-01-15T10:00:00Z' }, error: null },
    ],
    [
      'invalid checklist data',
      {
        data: {
          data: JSON.stringify({ invalid: true }),
          updated_at: '2025-01-15T10:00:00Z',
        },
        error: null,
      },
    ],
    ['missing updated_at', { data: { data: validData }, error: null }],
  ])('should throw SyncError for %s', async (_caseName, response) => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue(response)
    await expect(pullData({ projectId: 'p', anonKey: 'k' })).rejects.toThrow(SyncError)
  })
})

describe('subscribeToChanges', () => {
  it('should register the listener and remove its channel on unsubscribe', () => {
    mockSubscribe.mockReturnValue({})
    const unsubscribe = subscribeToChanges({ projectId: 'p', anonKey: 'k' }, vi.fn())

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_data' },
      expect.any(Function),
    )
    expect(unsubscribe).toEqual(expect.any(Function))
    unsubscribe!()
    expect(mockRemoveChannel).toHaveBeenCalledOnce()
  })
})
