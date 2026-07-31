import type { ChecklistContentSnapshot, ChecklistData } from '../types'
import { isChecklistContentSnapshot } from './validation'

export const RESTORE_BACKUP_STORAGE_KEY = 'flowboard-restore-backup'

export interface ChecklistRestoreBackup {
  version: 1
  createdAt: string
  before: ChecklistContentSnapshot
  restored: ChecklistContentSnapshot
}

export type RestoreDefaultsResult = 'success' | 'backup-failed' | 'persistence-failed'
export type UndoRestoreResult =
  'success' | 'backup-missing' | 'persistence-failed' | 'cleanup-failed'

export interface RestoreDefaultsControls {
  onRestoreDefaults: () => Promise<RestoreDefaultsResult>
  onUndoRestoreDefaults: () => Promise<UndoRestoreResult>
  hasRestoreBackup: boolean
  hasChangesSinceRestore: boolean
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}

function isRestoreBackup(value: unknown): value is ChecklistRestoreBackup {
  if (typeof value !== 'object' || value === null) return false
  const backup = value as Partial<ChecklistRestoreBackup>
  return (
    backup.version === 1 &&
    typeof backup.createdAt === 'string' &&
    isChecklistContentSnapshot(backup.before) &&
    isChecklistContentSnapshot(backup.restored)
  )
}

export function captureChecklistContent(data: ChecklistData): ChecklistContentSnapshot {
  return structuredClone({
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
    lastDailyReset: data.lastDailyReset,
    lastWeeklyReset: data.lastWeeklyReset,
    lastMonthlyReset: data.lastMonthlyReset,
  })
}

export function createRestoreBackup(
  before: ChecklistData,
  restored: ChecklistContentSnapshot,
  createdAt: Date,
): ChecklistRestoreBackup {
  return {
    version: 1,
    createdAt: createdAt.toISOString(),
    before: captureChecklistContent(before),
    restored: structuredClone(restored),
  }
}

export function loadRestoreBackup(
  storage: Storage | null = getStorage(),
): ChecklistRestoreBackup | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(RESTORE_BACKUP_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isRestoreBackup(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveRestoreBackup(
  backup: ChecklistRestoreBackup,
  storage: Storage | null = getStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(RESTORE_BACKUP_STORAGE_KEY, JSON.stringify(backup))
    return true
  } catch {
    return false
  }
}

export function clearRestoreBackup(storage: Storage | null = getStorage()): boolean {
  if (!storage) return false
  try {
    storage.removeItem(RESTORE_BACKUP_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function hasChecklistContentChanged(
  data: ChecklistData,
  expected: ChecklistContentSnapshot,
): boolean {
  return JSON.stringify(captureChecklistContent(data)) !== JSON.stringify(expected)
}
