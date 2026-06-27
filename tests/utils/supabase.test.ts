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

  it('should return null for legacy format config (pid/key)', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ pid: 'legacy-p', key: 'legacy-k' }))
    const config = loadSupabaseConfig()
    expect(config).toBeNull()
  })

  it('should return null for corrupted JSON', () => {
    localStorage.setItem(CONFIG_KEY, '{invalid')
    expect(loadSupabaseConfig()).toBeNull()
  })

  it('should return null for non-object JSON', () => {
    localStorage.setItem(CONFIG_KEY, '"string"')
    expect(loadSupabaseConfig()).toBeNull()
  })

  it('should return null for empty object', () => {
    localStorage.setItem(CONFIG_KEY, '{}')
    expect(loadSupabaseConfig()).toBeNull()
  })

  it('should return null for legacy with empty pid', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ pid: '', key: 'k' }))
    const config = loadSupabaseConfig()
    expect(config).toBeNull()
  })
})

describe('saveSupabaseConfig', () => {
  it('should save config to localStorage', () => {
    saveSupabaseConfig({ projectId: 'p1', anonKey: 'k1' })
    const raw = localStorage.getItem(CONFIG_KEY)
    expect(raw).toBe(JSON.stringify({ projectId: 'p1', anonKey: 'k1' }))
  })

  it('should overwrite existing config', () => {
    saveSupabaseConfig({ projectId: 'p1', anonKey: 'k1' })
    saveSupabaseConfig({ projectId: 'p2', anonKey: 'k2' })
    const config = loadSupabaseConfig()
    expect(config).toEqual({ projectId: 'p2', anonKey: 'k2' })
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

  it('should not throw when keys do not exist', () => {
    expect(() => clearSyncConfig()).not.toThrow()
  })
})

describe('loadLastSyncTime / saveLastSyncTime', () => {
  it('should return null when not set', () => {
    expect(loadLastSyncTime()).toBeNull()
  })

  it('should save and load last sync time', () => {
    const time = '2025-01-15T10:00:00Z'
    saveLastSyncTime(time)
    expect(loadLastSyncTime()).toBe(time)
  })
})

describe('loadLastSeenTime / saveLastSeenTime', () => {
  it('should return null when not set', () => {
    expect(loadLastSeenTime()).toBeNull()
  })

  it('should save and load last seen time', () => {
    const time = '2025-01-15T10:00:00Z'
    saveLastSeenTime(time)
    expect(loadLastSeenTime()).toBe(time)
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
  it('should return true when RPC succeeds', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: null })
    const result = await validateConfig('test-project', 'test-key')
    expect(result).toEqual({ ok: true })
  })

  it('should return true when error code is 42883 (function not found)', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: { code: '42883', message: 'not found' } })
    const result = await validateConfig('test-project', 'test-key')
    expect(result).toEqual({ ok: true })
  })

  it('should return true when error code is PGRST301', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: { code: 'PGRST301', message: 'not found' } })
    const result = await validateConfig('test-project', 'test-key')
    expect(result).toEqual({ ok: true })
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
    await expect(pushData({ projectId: 'p', anonKey: 'k' }, { daily: [] }))
      .rejects.toThrow(SyncError)
  })

  it('should throw SyncError when result is not string', async () => {
    mockRpc.mockReturnValue({ data: 123, error: null })
    await expect(pushData({ projectId: 'p', anonKey: 'k' }, { daily: [] }))
      .rejects.toThrow(SyncError)
  })
})

describe('pullData', () => {
  const validData = JSON.stringify({ daily: [], weekly: [], monthly: [], lastDailyReset: '', lastWeeklyReset: '', lastMonthlyReset: '', settings: { serverRegion: 'asia', isAutoMoveEnabled: true, shouldConfirmDelete: true } })

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

  it('should return null when no row exists (PGRST116)', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: { code: 'PGRST116' } })
    const result = await pullData({ projectId: 'p', anonKey: 'k' })
    expect(result).toBeNull()
  })

  it('should return null when row is null', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: null })
    const result = await pullData({ projectId: 'p', anonKey: 'k' })
    expect(result).toBeNull()
  })

  it('should throw SyncError on other RPC error', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({ data: null, error: { code: '500', message: 'server error' } })
    await expect(pullData({ projectId: 'p', anonKey: 'k' }))
      .rejects.toThrow(SyncError)
  })

  it('should throw SyncError on invalid JSON', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({
      data: { data: 'not-json', updated_at: '2025-01-15T10:00:00Z' },
      error: null,
    })
    await expect(pullData({ projectId: 'p', anonKey: 'k' }))
      .rejects.toThrow(SyncError)
  })

  it('should throw SyncError on invalid data structure', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({
      data: { data: JSON.stringify({ invalid: true }), updated_at: '2025-01-15T10:00:00Z' },
      error: null,
    })
    await expect(pullData({ projectId: 'p', anonKey: 'k' }))
      .rejects.toThrow(SyncError)
  })

  it('should throw SyncError when updated_at is missing', async () => {
    mockRpc.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockMaybeSingle.mockReturnValue({
      data: { data: validData },
      error: null,
    })
    await expect(pullData({ projectId: 'p', anonKey: 'k' }))
      .rejects.toThrow(SyncError)
  })
})

describe('subscribeToChanges', () => {
  it('should return unsubscribe function', () => {
    mockSubscribe.mockReturnValue({})
    const unsubscribe = subscribeToChanges({ projectId: 'p', anonKey: 'k' }, vi.fn())
    expect(typeof unsubscribe).toBe('function')
  })

  it('should call removeChannel on unsubscribe', () => {
    mockSubscribe.mockReturnValue({})
    const unsubscribe = subscribeToChanges({ projectId: 'p', anonKey: 'k' }, vi.fn())
    unsubscribe!()
    expect(mockRemoveChannel).toHaveBeenCalledOnce()
  })

  it('should register postgres_changes listener', () => {
    mockSubscribe.mockReturnValue({})
    subscribeToChanges({ projectId: 'p', anonKey: 'k' }, vi.fn())
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_data' },
      expect.any(Function),
    )
  })
})
