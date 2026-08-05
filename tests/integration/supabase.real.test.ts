import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ChecklistData } from '../../src/types'
import {
  pullData,
  pushData,
  resetClient,
  validateConfig,
  type SupabaseConfig,
} from '../../src/utils/supabase'

const projectUrl = process.env.SUPABASE_TEST_URL
const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
const allowWrite = process.env.SUPABASE_TEST_ALLOW_WRITE === 'true'

if (!projectUrl || !publishableKey || !allowWrite) {
  throw new Error(
    'Supabase integration tests require SUPABASE_TEST_URL, ' +
      'SUPABASE_TEST_PUBLISHABLE_KEY, and SUPABASE_TEST_ALLOW_WRITE=true',
  )
}

const activeConfig: SupabaseConfig = { projectId: projectUrl, anonKey: publishableKey }

type SyncRow = {
  data: string
  updated_at: string
}

describe('Supabase real environment', () => {
  const client = createClient(activeConfig.projectId, activeConfig.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  let originalRow: SyncRow | null = null
  let cloudDataWasChanged = false

  beforeAll(async () => {
    const validation = await validateConfig(activeConfig.projectId, activeConfig.anonKey)
    expect(validation).toEqual({ ok: true })

    const { data, error } = await client.rpc('pull_sync').maybeSingle<SyncRow>()
    expect(error).toBeNull()
    originalRow = data
  })

  afterAll(async () => {
    try {
      if (!cloudDataWasChanged) return

      if (originalRow) {
        const { error } = await client.rpc('upsert_sync', { p_data: originalRow.data })
        if (error) throw error
      } else {
        const { error } = await client.from('sync_data').delete().eq('id', 'NTE Flowboard')
        if (error) throw error
      }
    } finally {
      resetClient()
      await client.removeAllChannels()
    }
  })

  it('round-trips checklist data and emits a Realtime event', async () => {
    const marker = `real-integration-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const fixture = {
      daily: [
        {
          id: marker,
          text: marker,
          isCompleted: false,
          isHidden: false,
          order: 1,
          tags: ['integration'],
        },
      ],
      weekly: [],
      monthly: [],
      lastDailyReset: now,
      lastWeeklyReset: now,
      lastMonthlyReset: now,
      settings: {
        serverRegion: 'asia',
        isAutoMoveEnabled: true,
        shouldConfirmDelete: true,
      },
      uiPreferences: { cloudPatchHidden: false },
    } satisfies ChecklistData

    let channel: RealtimeChannel | null = null
    let eventTimeout: ReturnType<typeof setTimeout> | undefined
    const eventReceived = new Promise<void>((resolve, reject) => {
      eventTimeout = setTimeout(
        () => reject(new Error('Timed out waiting for the Supabase Realtime event')),
        15_000,
      )

      channel = client.channel(`flowboard-real-test-${marker}`).on(
        'postgres_changes',
        {
          event: originalRow ? 'UPDATE' : 'INSERT',
          schema: 'public',
          table: 'sync_data',
          filter: 'id=eq.NTE Flowboard',
        },
        () => {
          clearTimeout(eventTimeout)
          resolve()
        },
      )
    })

    const subscribed = new Promise<void>((resolve, reject) => {
      const subscribeTimeout = setTimeout(
        () => reject(new Error('Timed out subscribing to Supabase Realtime')),
        15_000,
      )

      channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(subscribeTimeout)
          resolve()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(subscribeTimeout)
          reject(new Error(`Supabase Realtime subscription failed: ${status}`))
        }
      })
    })

    try {
      await subscribed
      cloudDataWasChanged = true
      const pushed = await pushData(activeConfig, fixture)
      expect(pushed.outcome).toBe('applied')
      expect(Date.parse(pushed.updatedAt!)).not.toBeNaN()

      const pulled = await pullData(activeConfig)
      expect(pulled?.data).toEqual(fixture)
      expect(pulled?.updatedAt).toBe(pushed.updatedAt)
      await eventReceived
    } finally {
      if (eventTimeout) clearTimeout(eventTimeout)
      if (channel) await client.removeChannel(channel)
    }
  }, 30_000)
})
