import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

describe('Flowboard service worker notifications', () => {
  it('accepts a scheduled push when the persisted revision matches', async () => {
    const context = {
      clients: {},
      indexedDB: {},
      Promise,
      self: {
        addEventListener: vi.fn(),
        registration: { scope: 'https://flowboard.example/' },
      },
    } as unknown as {
      shouldShow: (payload: unknown, state: unknown) => Promise<boolean>
      buildBody: (payload: unknown, cycles: string[]) => string
    }

    runInNewContext(readFileSync('public/flowboard-sw.js', 'utf8'), context)

    const payload = {
      notificationType: 'before-reset',
      subscriptionId: 'subscription-1',
      ruleRevisions: { beforeReset: 'before-reset-1', reset: 'reset-1' },
      locale: 'zh-CN',
    }
    const state = {
      enabled: true,
      beforeResetEnabled: true,
      resetEnabled: true,
      subscriptionId: 'subscription-1',
      beforeResetRevision: 'before-reset-1',
      resetRevision: 'reset-1',
    }

    await expect(context.shouldShow(payload, state)).resolves.toBe(true)
    expect(context.buildBody(payload, ['daily', 'weekly'])).toBe(
      '每日和每周还有未完成事项，请在重置前完成',
    )
  })

  it('renotifies when consecutive test pushes reuse the same tag', async () => {
    const handlers: Record<string, (event: unknown) => void> = {}
    const showNotification = vi.fn().mockResolvedValue(undefined)
    const context = {
      clients: {
        matchAll: vi.fn().mockResolvedValue([]),
        openWindow: vi.fn().mockResolvedValue(undefined),
      },
      indexedDB: {
        open: () => {
          throw new Error('IndexedDB is not needed for test notifications')
        },
      },
      Promise,
      self: {
        addEventListener: (type: string, handler: (event: unknown) => void) => {
          handlers[type] = handler
        },
        registration: {
          scope: 'https://flowboard.example/',
          showNotification,
        },
      },
    }

    runInNewContext(readFileSync('public/flowboard-sw.js', 'utf8'), context)

    const payload = {
      title: 'NTE Flowboard',
      body: 'Test notification delivered.',
      tag: 'flowboard-test',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      issuedAt: new Date().toISOString(),
      notificationType: 'test',
      subscriptionId: 'subscription-1',
      ruleRevisions: { beforeReset: 'before-reset-1', reset: 'reset-1' },
      cycles: [],
    }

    const dispatchPush = async () => {
      let pending: Promise<void> | undefined
      handlers.push({
        data: { json: () => payload },
        waitUntil: (promise: Promise<void>) => {
          pending = promise
        },
      })
      await pending
    }

    await dispatchPush()
    await dispatchPush()

    expect(showNotification).toHaveBeenCalledTimes(2)
    expect(showNotification).toHaveBeenNthCalledWith(
      2,
      'NTE Flowboard',
      expect.objectContaining({ tag: 'flowboard-test', renotify: true }),
    )
  })

  it('sends a conditional background sync request with the queued base version', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ outcome: 'applied', updated_at: '2026-08-05T02:00:00.000Z' }],
    })
    const context = {
      clients: {},
      fetch,
      indexedDB: {},
      Promise,
      self: {
        addEventListener: vi.fn(),
        registration: { scope: 'https://flowboard.example/' },
      },
    } as unknown as {
      requestConditionalSync: (pending: Record<string, unknown>) => Promise<unknown>
      mergeBackgroundResult: (
        state: Record<string, unknown>,
        pending: Record<string, unknown>,
        result: Record<string, unknown>,
      ) => Record<string, unknown>
    }
    runInNewContext(readFileSync('public/flowboard-sw.js', 'utf8'), context)

    await expect(
      context.requestConditionalSync({
        supabaseUrl: 'https://project.supabase.co',
        publishableKey: 'publishable-key',
        data: { daily: [] },
        expectedUpdatedAt: '2026-08-05T01:00:00.000Z',
      }),
    ).resolves.toEqual({ status: 'applied', updatedAt: '2026-08-05T02:00:00.000Z' })
    expect(fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/rest/v1/rpc/upsert_sync_if_unchanged',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'publishable-key',
          Authorization: 'Bearer publishable-key',
        }),
      }),
    )

    const pending = {
      id: 'change-1',
      supabaseUrl: 'https://project.supabase.co',
      publishableKey: 'publishable-key',
      operationVersion: 2,
      status: 'pending',
    }
    expect(
      context.mergeBackgroundResult({ pending, lastResult: null }, pending, {
        status: 'error',
        updatedAt: null,
      }),
    ).toMatchObject({
      pending,
      lastResult: {
        supabaseUrl: 'https://project.supabase.co',
        publishableKey: 'publishable-key',
      },
    })

    const newerProjectPending = {
      ...pending,
      id: 'change-2',
      supabaseUrl: 'https://other.supabase.co',
    }
    expect(
      context.mergeBackgroundResult({ pending: newerProjectPending, lastResult: null }, pending, {
        status: 'applied',
        updatedAt: '2026-08-05T02:00:00.000Z',
      }),
    ).toEqual({ pending: newerProjectPending, lastResult: null })
  })
})
