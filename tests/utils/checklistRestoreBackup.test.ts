import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistContentSnapshot } from '../../src/types'
import {
  RESTORE_BACKUP_STORAGE_KEY,
  captureChecklistContent,
  createChecklistRestoreSessionStore,
  createRestoreSession,
  hasChecklistContentChanged,
} from '../../src/utils/checklistRestoreBackup'
import { createDefaultChecklistData } from '../../src/utils/defaultData'
import type { ChecklistRevision } from '../../src/utils/storage'
import { subscribeLegacyStorageEvents } from '../../src/utils/legacyStorageEvents'

const revision = '3:test' as ChecklistRevision

function createSession() {
  const data = createDefaultChecklistData('zh-CN')
  const restored: ChecklistContentSnapshot = {
    ...captureChecklistContent(data),
    daily: [],
  }
  return createRestoreSession(data, restored, new Date('2026-07-29T12:00:00.000Z'), revision)
}

describe('checklist restore session store', () => {
  beforeEach(() => localStorage.clear())

  it('conditionally creates and clears one durable session without storing settings', () => {
    const store = createChecklistRestoreSessionStore()
    const session = createSession()

    expect(store.save(session, null)).toBe(true)
    expect(store.load()).toEqual(session)
    expect(localStorage.getItem(RESTORE_BACKUP_STORAGE_KEY)).not.toContain('serverRegion')
    expect(store.clear(session.id)).toBe('success')
    expect(store.load()).toBeNull()
  })

  it('rejects writes and deletes made against a stale session id', () => {
    const store = createChecklistRestoreSessionStore()
    const session = createSession()
    expect(store.save(session, null)).toBe(true)

    expect(store.save({ ...session, id: 'replacement' }, 'stale')).toBe(false)
    expect(store.clear('stale')).toBe('conflict')
    expect(store.load()).toEqual(session)
  })

  it('loads a version 1 backup as a compatible restore session', () => {
    const session = createSession()
    localStorage.setItem(
      RESTORE_BACKUP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        createdAt: session.createdAt,
        before: session.before,
        restored: session.restored,
      }),
    )

    expect(createChecklistRestoreSessionStore().load()).toEqual({
      ...session,
      id: `legacy:${session.createdAt}`,
      checklistRevision: null,
    })
    expect(JSON.parse(localStorage.getItem(RESTORE_BACKUP_STORAGE_KEY)!)).toMatchObject({
      version: 2,
      id: `legacy:${session.createdAt}`,
      checklistRevision: null,
    })
    expect(localStorage.getItem(`${RESTORE_BACKUP_STORAGE_KEY}-v1-backup`)).toBeNull()
  })

  it('detects checklist changes but ignores settings changes', () => {
    const data = createDefaultChecklistData('zh-CN')
    const expected = captureChecklistContent(data)

    expect(
      hasChecklistContentChanged(
        { ...data, settings: { ...data.settings, serverRegion: 'europe' } },
        expected,
      ),
    ).toBe(false)
    expect(hasChecklistContentChanged({ ...data, daily: [] }, expected)).toBe(true)
  })

  it('reports storage failures and ignores malformed sessions', () => {
    const failingStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded')
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    } as unknown as Storage
    const failingStore = createChecklistRestoreSessionStore(failingStorage)

    expect(failingStore.save(createSession(), null)).toBe(false)
    localStorage.setItem(RESTORE_BACKUP_STORAGE_KEY, JSON.stringify({ version: 2 }))
    expect(createChecklistRestoreSessionStore().load()).toBeNull()
  })

  it('keeps a version 1 backup when the v2 rewrite cannot be verified', () => {
    const session = createSession()
    const legacyRaw = JSON.stringify({
      version: 1,
      createdAt: session.createdAt,
      before: session.before,
      restored: session.restored,
    })
    const failingStorage = {
      getItem: vi.fn((key: string) => (key === RESTORE_BACKUP_STORAGE_KEY ? legacyRaw : null)),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded')
      }),
      removeItem: vi.fn(),
    } as unknown as Storage

    const loaded = createChecklistRestoreSessionStore(failingStorage).load()

    expect(loaded?.version).toBe(2)
    expect(failingStorage.setItem).toHaveBeenCalledOnce()
  })

  it('deletes malformed or unknown restore backups', () => {
    localStorage.setItem(RESTORE_BACKUP_STORAGE_KEY, JSON.stringify({ version: 99 }))

    expect(createChecklistRestoreSessionStore().load()).toBeNull()
    expect(localStorage.getItem(RESTORE_BACKUP_STORAGE_KEY)).toBeNull()
  })

  it('reports an incomplete migration when an invalid restore backup cannot be deleted', () => {
    localStorage.setItem(RESTORE_BACKUP_STORAGE_KEY, JSON.stringify({ version: 99 }))
    const events: string[] = []
    const unsubscribe = subscribeLegacyStorageEvents((event) => events.push(event))
    const originalRemoveItem = Storage.prototype.removeItem
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key) {
      if (key === RESTORE_BACKUP_STORAGE_KEY) return
      originalRemoveItem.call(this, key)
    })

    expect(createChecklistRestoreSessionStore().load()).toBeNull()
    expect(localStorage.getItem(RESTORE_BACKUP_STORAGE_KEY)).not.toBeNull()
    expect(events).toContain('failed')
    unsubscribe()
  })
})
