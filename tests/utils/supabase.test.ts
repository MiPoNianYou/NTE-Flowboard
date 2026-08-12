import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  clearSyncConfig,
  loadCloudSyncState,
  saveCloudSyncState,
  isSameSupabaseProject,
  resetClient,
  SyncError,
  validateConfig,
  detectConditionalWriteCapability,
  pushData,
  pullData,
  subscribeToChanges,
} from '../../src/utils/supabase'
import { createClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'flowboard-cloud-config'
const SYNC_STATE_KEY = 'flowboard-cloud-sync-state'
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

  it('should migrate a valid legacy config and delete it', () => {
    localStorage.setItem('nte-supabase-config', JSON.stringify({ projectId: 'p1', anonKey: 'k1' }))
    expect(loadSupabaseConfig()).toEqual({ projectId: 'p1', anonKey: 'k1' })
    expect(localStorage.getItem('nte-supabase-config')).toBeNull()
  })

  it('should keep a conflicting legacy config', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ projectId: 'current', anonKey: 'k' }))
    localStorage.setItem(
      'nte-supabase-config',
      JSON.stringify({ projectId: 'legacy', anonKey: 'k' }),
    )
    expect(loadSupabaseConfig()).toEqual({ projectId: 'current', anonKey: 'k' })
    expect(localStorage.getItem('nte-supabase-config')).not.toBeNull()
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
    localStorage.setItem(SYNC_STATE_KEY, 'state')
    localStorage.setItem(LAST_SYNC_KEY, 'sync')
    localStorage.setItem(LAST_SEEN_KEY, 'seen')
    localStorage.setItem('nte-supabase-config', 'legacy-config')
    localStorage.setItem('nte-supabase-last-sync', 'legacy-sync')
    localStorage.setItem('nte-supabase-last-seen', 'legacy-seen')

    clearSyncConfig()

    expect(localStorage.getItem(CONFIG_KEY)).toBeNull()
    expect(localStorage.getItem(SYNC_STATE_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBeNull()
    expect(localStorage.getItem('nte-supabase-config')).toBeNull()
    expect(localStorage.getItem('nte-supabase-last-sync')).toBeNull()
    expect(localStorage.getItem('nte-supabase-last-seen')).toBeNull()
  })
})

describe('cloud sync state', () => {
  it('compares project IDs and canonical Supabase URLs as the same project', () => {
    expect(isSameSupabaseProject('project', 'https://project.supabase.co/')).toBe(true)
    expect(isSameSupabaseProject('project', 'other-project')).toBe(false)
  })

  it('should round-trip the combined state', () => {
    const state = {
      projectId: 'p',
      lastSeenAt: '2025-01-15T10:00:00.123456Z',
      lastSuccessfulSyncAt: '2025-01-15T10:01:00Z',
    }

    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: null,
      lastSuccessfulSyncAt: null,
    })
    expect(saveCloudSyncState(state)).toBe(true)
    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual(state)
  })

  it('should migrate legacy timestamps and remove all old keys after confirmation', () => {
    localStorage.setItem('nte-supabase-last-sync', '2025-01-15T10:00:00Z')
    localStorage.setItem('nte-supabase-last-seen', '2025-01-15T11:00:00Z')
    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: '2025-01-15T11:00:00Z',
      lastSuccessfulSyncAt: '2025-01-15T10:00:00Z',
    })
    expect(localStorage.getItem('nte-supabase-last-sync')).toBeNull()
    expect(localStorage.getItem('nte-supabase-last-seen')).toBeNull()
  })

  it('should migrate valid values and discard invalid values without backups', () => {
    localStorage.setItem('flowboard-cloud-last-sync', '2025-01-15T10:00:00Z')
    localStorage.setItem('nte-supabase-last-sync', 'not-a-time')
    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: null,
      lastSuccessfulSyncAt: '2025-01-15T10:00:00Z',
    })
    expect(localStorage.getItem('nte-supabase-last-sync')).toBeNull()
    expect(localStorage.getItem('flowboard-cloud-last-sync')).toBeNull()
    expect(localStorage.getItem('flowboard-cloud-last-sync-corrupted-backup')).toBeNull()
  })

  it('should prefer an existing state and delete conflicting legacy keys', () => {
    localStorage.setItem(
      SYNC_STATE_KEY,
      JSON.stringify({
        projectId: 'p',
        lastSeenAt: '2025-01-15T11:00:00Z',
        lastSuccessfulSyncAt: null,
      }),
    )
    localStorage.setItem('flowboard-cloud-last-seen', '2025-01-15T12:00:00Z')

    expect(loadCloudSyncState({ projectId: 'https://p.supabase.co/', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: '2025-01-15T11:00:00Z',
      lastSuccessfulSyncAt: null,
    })
    expect(localStorage.getItem('flowboard-cloud-last-seen')).toBeNull()
  })

  it('should reset state when it belongs to another project', () => {
    localStorage.setItem(
      SYNC_STATE_KEY,
      JSON.stringify({
        projectId: 'other',
        lastSeenAt: '2025-01-15T11:00:00Z',
        lastSuccessfulSyncAt: '2025-01-15T11:01:00Z',
      }),
    )

    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: null,
      lastSuccessfulSyncAt: null,
    })
  })

  it('should rebuild a damaged state from valid legacy values without backups', () => {
    localStorage.setItem(SYNC_STATE_KEY, '{invalid')
    localStorage.setItem(LAST_SYNC_KEY, '2025-01-15T10:00:00Z')
    localStorage.setItem(LAST_SEEN_KEY, '2025-01-15T11:00:00Z')

    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: '2025-01-15T11:00:00Z',
      lastSuccessfulSyncAt: '2025-01-15T10:00:00Z',
    })
    expect(localStorage.getItem(`${SYNC_STATE_KEY}-corrupted-backup`)).toBeNull()
  })

  it('should preserve legacy values when the replacement write fails', () => {
    localStorage.setItem(LAST_SYNC_KEY, '2025-01-15T10:00:00Z')
    const originalSetItem = Storage.prototype.setItem
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === SYNC_STATE_KEY) throw new Error('quota exceeded')
      return originalSetItem.call(this, key, value)
    })

    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: null,
      lastSuccessfulSyncAt: '2025-01-15T10:00:00Z',
    })
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBe('2025-01-15T10:00:00Z')
    setItem.mockRestore()
  })

  it('should retain a legacy key when its deletion fails', () => {
    localStorage.setItem(LAST_SYNC_KEY, '2025-01-15T10:00:00Z')
    const originalRemoveItem = Storage.prototype.removeItem
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
      this: Storage,
      key,
    ) {
      if (key === LAST_SYNC_KEY) throw new Error('storage failure')
      return originalRemoveItem.call(this, key)
    })

    expect(loadCloudSyncState({ projectId: 'p', anonKey: 'k' })).toEqual({
      projectId: 'p',
      lastSeenAt: null,
      lastSuccessfulSyncAt: '2025-01-15T10:00:00Z',
    })
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBe('2025-01-15T10:00:00Z')
    removeItem.mockRestore()
  })

  it('should remove orphaned state and legacy keys without config', () => {
    localStorage.setItem(SYNC_STATE_KEY, '{}')
    localStorage.setItem(LAST_SYNC_KEY, '2025-01-15T10:00:00Z')
    localStorage.setItem(LAST_SEEN_KEY, '2025-01-15T11:00:00Z')

    expect(loadCloudSyncState(null)).toBeNull()
    expect(localStorage.getItem(SYNC_STATE_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_SYNC_KEY)).toBeNull()
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBeNull()
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
    expect(result).toEqual({ outcome: 'applied', updatedAt: timestamp })
  })

  it('should perform a conditional write with the last seen timestamp', async () => {
    mockRpc.mockReturnValue({
      data: [{ outcome: 'conflict', updated_at: '2025-01-15T11:00:00Z' }],
      error: null,
    })

    await expect(
      pushData(
        { projectId: 'p', anonKey: 'k' },
        { daily: [] },
        { expectedUpdatedAt: '2025-01-15T10:00:00Z' },
      ),
    ).resolves.toEqual({ outcome: 'conflict', updatedAt: '2025-01-15T11:00:00Z' })
    expect(mockRpc).toHaveBeenCalledWith('upsert_sync_if_unchanged', {
      p_data: JSON.stringify({ daily: [] }, null, 2),
      p_expected_updated_at: '2025-01-15T10:00:00Z',
    })
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

describe('detectConditionalWriteCapability', () => {
  it('detects the conditional write capability', async () => {
    mockRpc.mockReturnValue({ data: ['conditional_write_v1'], error: null })

    await expect(detectConditionalWriteCapability({ projectId: 'p', anonKey: 'k' })).resolves.toBe(
      true,
    )
  })

  it('treats a missing capability RPC as unsupported', async () => {
    mockRpc.mockReturnValue({ data: null, error: { code: 'PGRST202' } })

    await expect(detectConditionalWriteCapability({ projectId: 'p', anonKey: 'k' })).resolves.toBe(
      false,
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
