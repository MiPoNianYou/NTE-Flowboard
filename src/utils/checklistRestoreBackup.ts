import type { ChecklistContentSnapshot, ChecklistData } from '../types'
import type { ChecklistRevision } from './storage'
import { isChecklistContentSnapshot } from './validation'
import { removeStorageKey } from './legacyStorageMigration'
import { reportLegacyStorageFailure } from './legacyStorageEvents'

export const RESTORE_BACKUP_STORAGE_KEY = 'flowboard-restore-backup'

export interface ChecklistRestoreSession {
  version: 2
  id: string
  createdAt: string
  before: ChecklistContentSnapshot
  restored: ChecklistContentSnapshot
  checklistRevision: ChecklistRevision | null
}

export interface ChecklistRestoreState {
  sessionId: string | null
  hasRestoreBackup: boolean
  hasChangesSinceRestore: boolean
}

export type RestoreDefaultsResult = 'success' | 'backup-failed' | 'persistence-failed' | 'conflict'
export type UndoRestoreResult =
  | 'success'
  | 'backup-missing'
  | 'changes-detected'
  | 'persistence-failed'
  | 'cleanup-failed'
  | 'conflict'
export type DiscardRestoreResult = 'success' | 'backup-missing' | 'cleanup-failed' | 'conflict'

export interface RestoreDefaultsControls {
  onRestoreDefaults: () => Promise<RestoreDefaultsResult>
  onUndoRestoreDefaults: (overwrite?: boolean) => Promise<UndoRestoreResult>
  hasRestoreBackup: boolean
  hasChangesSinceRestore: boolean
}

export type RestoreSessionClearResult = 'success' | 'missing' | 'conflict' | 'failed'

export interface ChecklistRestoreSessionStore {
  load: () => ChecklistRestoreSession | null
  save: (session: ChecklistRestoreSession, expectedSessionId: string | null) => boolean
  clear: (expectedSessionId: string) => RestoreSessionClearResult
  subscribe: (listener: () => void) => () => void
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}

function isRevision(value: unknown): value is ChecklistRevision {
  return typeof value === 'string' && /^\d+:/.test(value)
}

interface ParsedRestoreSession {
  session: ChecklistRestoreSession
  migrated: boolean
}

function parseRestoreSession(raw: string | null): ParsedRestoreSession | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const session = parsed as {
      version?: unknown
      id?: unknown
      createdAt?: unknown
      before?: unknown
      restored?: unknown
      checklistRevision?: unknown
    }
    if (
      typeof session.createdAt !== 'string' ||
      !isChecklistContentSnapshot(session.before) ||
      !isChecklistContentSnapshot(session.restored)
    ) {
      return null
    }
    if (
      session.version === 2 &&
      typeof session.id === 'string' &&
      (session.checklistRevision === null || isRevision(session.checklistRevision))
    ) {
      return { session: session as ChecklistRestoreSession, migrated: false }
    }
    if (session.version === 1) {
      return {
        session: {
          version: 2,
          id: `legacy:${session.createdAt}`,
          createdAt: session.createdAt,
          before: session.before,
          restored: session.restored,
          checklistRevision: null,
        },
        migrated: true,
      }
    }
  } catch {
    return null
  }
  return null
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

export function createRestoreSession(
  before: ChecklistData,
  restored: ChecklistContentSnapshot,
  createdAt: Date,
  checklistRevision: ChecklistRevision,
): ChecklistRestoreSession {
  return {
    version: 2,
    id: `${createdAt.getTime().toString(36)}-${Math.random().toString(36).slice(2)}`,
    createdAt: createdAt.toISOString(),
    before: captureChecklistContent(before),
    restored: structuredClone(restored),
    checklistRevision,
  }
}

export function createChecklistRestoreSessionStore(
  storage: Storage | null = getStorage(),
): ChecklistRestoreSessionStore {
  const load = () => {
    if (!storage) return null
    try {
      const raw = storage.getItem(RESTORE_BACKUP_STORAGE_KEY)
      const parsed = parseRestoreSession(raw)
      if (!parsed) {
        if (raw !== null && !removeStorageKey(storage, RESTORE_BACKUP_STORAGE_KEY)) {
          reportLegacyStorageFailure()
        }
        return null
      }
      if (parsed.migrated) {
        const serialized = JSON.stringify(parsed.session)
        try {
          storage.setItem(RESTORE_BACKUP_STORAGE_KEY, serialized)
          const confirmed = parseRestoreSession(storage.getItem(RESTORE_BACKUP_STORAGE_KEY))
          if (
            !confirmed ||
            confirmed.migrated ||
            JSON.stringify(confirmed.session) !== serialized
          ) {
            return parsed.session
          }
        } catch {
          return parsed.session
        }
      }
      return parsed.session
    } catch {
      return null
    }
  }

  return {
    load,
    save: (session, expectedSessionId) => {
      if (!storage) return false
      try {
        const current = load()
        if ((current?.id ?? null) !== expectedSessionId) return false
        storage.setItem(RESTORE_BACKUP_STORAGE_KEY, JSON.stringify(session))
        return load()?.id === session.id
      } catch {
        return false
      }
    },
    clear: (expectedSessionId) => {
      if (!storage) return 'failed'
      try {
        const current = load()
        if (!current) return 'missing'
        if (current.id !== expectedSessionId) return 'conflict'
        return removeStorageKey(storage, RESTORE_BACKUP_STORAGE_KEY) ? 'success' : 'failed'
      } catch {
        return 'failed'
      }
    },
    subscribe: (listener) => {
      if (typeof window === 'undefined') return () => undefined
      const handleStorage = (event: StorageEvent) => {
        if (event.key === RESTORE_BACKUP_STORAGE_KEY) listener()
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },
  }
}

export function hasChecklistContentChanged(
  data: ChecklistData,
  expected: ChecklistContentSnapshot,
): boolean {
  return JSON.stringify(captureChecklistContent(data)) !== JSON.stringify(expected)
}
