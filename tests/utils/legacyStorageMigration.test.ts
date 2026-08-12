import { beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateLegacyStorageValue } from '../../src/utils/legacyStorageMigration'

const options = {
  legacyKey: 'legacy',
  currentKey: 'current',
  parse: (raw: string) => {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof (value as { value?: unknown }).value !== 'number'
    ) {
      return null
    }
    return value as { value: number }
  },
  serialize: JSON.stringify,
}

describe('migrateLegacyStorageValue', () => {
  beforeEach(() => localStorage.clear())

  it('writes and verifies a valid legacy value before deleting it', () => {
    localStorage.setItem('legacy', JSON.stringify({ value: 1 }))

    expect(migrateLegacyStorageValue(localStorage, options)).toBe('migrated')
    expect(JSON.parse(localStorage.getItem('current')!)).toEqual({ value: 1 })
    expect(localStorage.getItem('legacy')).toBeNull()
  })

  it('deletes an invalid legacy value without creating a current value', () => {
    localStorage.setItem('legacy', '{broken')

    expect(migrateLegacyStorageValue(localStorage, options)).toBe('invalid-legacy')
    expect(localStorage.getItem('current')).toBeNull()
    expect(localStorage.getItem('legacy')).toBeNull()
  })

  it('deletes an equivalent legacy value when both keys exist', () => {
    localStorage.setItem('current', JSON.stringify({ value: 1 }))
    localStorage.setItem('legacy', '{"value":1}')

    expect(migrateLegacyStorageValue(localStorage, options)).toBe('cleaned')
    expect(localStorage.getItem('legacy')).toBeNull()
  })

  it('keeps a conflicting legacy value and reports the conflict', () => {
    const onConflict = vi.fn()
    localStorage.setItem('current', JSON.stringify({ value: 2 }))
    localStorage.setItem('legacy', JSON.stringify({ value: 1 }))

    expect(migrateLegacyStorageValue(localStorage, { ...options, onConflict })).toBe('conflict')
    expect(localStorage.getItem('legacy')).not.toBeNull()
    expect(onConflict).toHaveBeenCalledWith('legacy', 'current')
  })

  it('backs up an invalid current value and restores it from valid legacy data', () => {
    localStorage.setItem('current', '{broken')
    localStorage.setItem('legacy', JSON.stringify({ value: 1 }))

    expect(
      migrateLegacyStorageValue(localStorage, { ...options, corruptedBackupKey: 'backup' }),
    ).toBe('recovered')
    expect(localStorage.getItem('backup')).toBe('{broken')
    expect(JSON.parse(localStorage.getItem('current')!)).toEqual({ value: 1 })
    expect(localStorage.getItem('legacy')).toBeNull()
  })

  it('uses a per-current-key backup by default', () => {
    localStorage.setItem('current', '{broken')
    localStorage.setItem('legacy', JSON.stringify({ value: 1 }))

    expect(migrateLegacyStorageValue(localStorage, options)).toBe('recovered')
    expect(localStorage.getItem('current-corrupted-backup')).toBe('{broken')
  })

  it('retains legacy data when the write or readback verification fails', () => {
    localStorage.setItem('legacy', JSON.stringify({ value: 1 }))
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded')
    })

    expect(migrateLegacyStorageValue(localStorage, options)).toBe('failed')
    expect(localStorage.getItem('legacy')).not.toBeNull()
    setItem.mockRestore()
  })

  it('reports a failed cleanup without deleting the legacy value', () => {
    const onFailure = vi.fn()
    localStorage.setItem('current', JSON.stringify({ value: 1 }))
    localStorage.setItem('legacy', JSON.stringify({ value: 1 }))
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined)

    expect(migrateLegacyStorageValue(localStorage, { ...options, onFailure })).toBe('failed')
    expect(localStorage.getItem('legacy')).not.toBeNull()
    expect(onFailure).toHaveBeenCalledWith('legacy', 'current')
    removeItem.mockRestore()
  })
})
