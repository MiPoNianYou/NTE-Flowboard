import { describe, expect, it } from 'vitest'
import { resolveConflict, shouldImport, shouldPull } from '../../src/utils/syncPolicy'

describe('shouldPull', () => {
  it('skips overlapping pulls and protects unsynced local changes', () => {
    expect(shouldPull({ isPulling: true, hasLocalChanges: false, shouldForce: false })).toBe(false)
    expect(shouldPull({ isPulling: false, hasLocalChanges: true, shouldForce: false })).toBe(false)
  })

  it('allows a forced pull despite local changes', () => {
    expect(shouldPull({ isPulling: false, hasLocalChanges: true, shouldForce: true })).toBe(true)
  })

  it('allows an idle pull without local changes', () => {
    expect(shouldPull({ isPulling: false, hasLocalChanges: false, shouldForce: false })).toBe(true)
  })
})

describe('shouldImport', () => {
  const remoteUpdatedAt = '2026-07-10T12:00:00.000Z'

  it('imports when remote data is newer or has never been seen', () => {
    expect(shouldImport({ remoteUpdatedAt, lastSeenTime: null, skipFirstImport: false })).toBe(true)
    expect(
      shouldImport({
        remoteUpdatedAt,
        lastSeenTime: '2026-07-10T11:59:59.999Z',
        skipFirstImport: false,
      }),
    ).toBe(true)
  })

  it('does not overwrite data with equal or older remote revisions', () => {
    expect(
      shouldImport({ remoteUpdatedAt, lastSeenTime: remoteUpdatedAt, skipFirstImport: false }),
    ).toBe(false)
    expect(
      shouldImport({
        remoteUpdatedAt,
        lastSeenTime: '2026-07-10T12:00:00.001Z',
        skipFirstImport: false,
      }),
    ).toBe(false)
  })

  it('skips first import until a newer remote revision exists after a known sync', () => {
    expect(shouldImport({ remoteUpdatedAt, lastSeenTime: null, skipFirstImport: true })).toBe(false)
    expect(
      shouldImport({
        remoteUpdatedAt,
        lastSeenTime: '2026-07-10T11:59:59.999Z',
        skipFirstImport: true,
      }),
    ).toBe(true)
  })
})

describe('resolveConflict', () => {
  it('keeps unsynced local data and otherwise accepts remote data', () => {
    expect(resolveConflict(true)).toBe('local')
    expect(resolveConflict(false)).toBe('remote')
  })
})
