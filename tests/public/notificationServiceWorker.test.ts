import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

describe('notification service worker', () => {
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

    runInNewContext(readFileSync('public/notification-sw.js', 'utf8'), context)

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

    runInNewContext(readFileSync('public/notification-sw.js', 'utf8'), context)

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
})
