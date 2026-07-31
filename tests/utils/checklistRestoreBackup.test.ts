import { describe, expect, it, vi } from 'vitest'
import type { ChecklistContentSnapshot, ChecklistData } from '../../src/types'
import {
  RESTORE_BACKUP_STORAGE_KEY,
  captureChecklistContent,
  clearRestoreBackup,
  createRestoreBackup,
  hasChecklistContentChanged,
  loadRestoreBackup,
  saveRestoreBackup,
} from '../../src/utils/checklistRestoreBackup'
import { createDefaultChecklistData } from '../../src/utils/defaultData'

function createData(): ChecklistData {
  return createDefaultChecklistData('zh-CN')
}

describe('checklist restore backup', () => {
  it('round-trips one durable backup without storing settings', () => {
    const data = createData()
    const restored: ChecklistContentSnapshot = {
      ...captureChecklistContent(data),
      daily: [],
    }
    const backup = createRestoreBackup(data, restored, new Date('2026-07-29T12:00:00.000Z'))

    expect(saveRestoreBackup(backup)).toBe(true)
    expect(loadRestoreBackup()).toEqual(backup)
    expect(localStorage.getItem(RESTORE_BACKUP_STORAGE_KEY)).not.toContain('serverRegion')
  })

  it('detects checklist changes but ignores settings changes', () => {
    const data = createData()
    const expected = captureChecklistContent(data)

    expect(
      hasChecklistContentChanged(
        { ...data, settings: { ...data.settings, serverRegion: 'europe' } },
        expected,
      ),
    ).toBe(false)
    expect(hasChecklistContentChanged({ ...data, daily: [] }, expected)).toBe(true)
  })

  it('returns failure without mutating when storage writes or deletes fail', () => {
    const data = createData()
    const backup = createRestoreBackup(
      data,
      captureChecklistContent(data),
      new Date('2026-07-29T12:00:00.000Z'),
    )
    const failingStorage = {
      setItem: vi.fn(() => {
        throw new Error('quota exceeded')
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    } as unknown as Storage

    expect(saveRestoreBackup(backup, failingStorage)).toBe(false)
    expect(clearRestoreBackup(failingStorage)).toBe(false)
  })

  it('ignores malformed stored backups', () => {
    localStorage.setItem(RESTORE_BACKUP_STORAGE_KEY, JSON.stringify({ version: 1 }))
    expect(loadRestoreBackup()).toBeNull()
  })
})
