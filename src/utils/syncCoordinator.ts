import type { ChecklistData, SyncStatus } from '../types'
import * as syncPolicy from './syncPolicy'

export type SyncCommand = 'none' | 'pull' | 'push' | 'import-remote' | 'schedule-push'

export interface SyncCoordinationState {
  syncStatus: SyncStatus
  isPulling: boolean
  hasLocalChanges: boolean
  shouldSkipNextPush: boolean
  lastSeenTime: string | null
  isDataInitialized: boolean
}

export interface SyncDecision {
  state: SyncCoordinationState
  command: SyncCommand
  shouldRetry?: 'pull' | 'push'
  shouldResetRetries?: boolean
  importData?: ChecklistData
}

export type SyncEvent =
  | { kind: 'local-data-changed' }
  | { kind: 'external-data-applied' }
  | { kind: 'request-pull'; force: boolean }
  | { kind: 'pull-empty' }
  | {
      kind: 'pull-succeeded'
      data: ChecklistData
      updatedAt: string
      skipFirstImport: boolean
      pushAfterPull: boolean
    }
  | { kind: 'pull-failed' }
  | { kind: 'request-push' }
  | { kind: 'push-succeeded'; updatedAt: string }
  | { kind: 'push-failed' }
  | { kind: 'connected' }

export function coordinateSync(state: SyncCoordinationState, event: SyncEvent): SyncDecision {
  switch (event.kind) {
    case 'local-data-changed':
      if (!state.isDataInitialized) return decision({ ...state, isDataInitialized: true })
      if (state.shouldSkipNextPush) return decision({ ...state, shouldSkipNextPush: false })
      return decision(
        { ...state, hasLocalChanges: true },
        state.syncStatus === 'connected' ? 'schedule-push' : 'none',
      )
    case 'external-data-applied':
      return decision({ ...state, hasLocalChanges: false, shouldSkipNextPush: true })
    case 'request-pull':
      if (
        !syncPolicy.shouldPull({
          isPulling: state.isPulling,
          hasLocalChanges: state.hasLocalChanges,
          shouldForce: event.force,
        })
      )
        return decision(state)
      return decision({ ...state, isPulling: true, syncStatus: 'syncing' }, 'pull')
    case 'pull-empty':
      return decision({ ...state, isPulling: false, syncStatus: 'connected' }, 'none', true)
    case 'pull-succeeded': {
      const shouldImport = syncPolicy.shouldImport({
        remoteUpdatedAt: event.updatedAt,
        lastSeenTime: state.lastSeenTime,
        skipFirstImport: event.skipFirstImport,
      })
      const next: SyncCoordinationState = {
        ...state,
        isPulling: false,
        syncStatus: 'connected',
        lastSeenTime: event.updatedAt,
      }
      if (shouldImport)
        return {
          state: { ...next, hasLocalChanges: false, shouldSkipNextPush: true },
          command: 'import-remote',
          shouldResetRetries: true,
          importData: event.data,
        }
      return decision(next, event.pushAfterPull ? 'push' : 'none', true)
    }
    case 'pull-failed':
      return decision({ ...state, isPulling: false, syncStatus: 'error' }, 'none', false, 'pull')
    case 'request-push':
      return state.isPulling
        ? decision(state)
        : decision({ ...state, syncStatus: 'syncing' }, 'push')
    case 'push-succeeded':
      return decision(
        {
          ...state,
          syncStatus: 'connected',
          hasLocalChanges: false,
          lastSeenTime: event.updatedAt,
        },
        'none',
        true,
      )
    case 'push-failed':
      return decision({ ...state, syncStatus: 'error' }, 'none', false, 'push')
    case 'connected':
      return decision({ ...state, syncStatus: 'connected' })
  }
}

function decision(
  state: SyncCoordinationState,
  command: SyncCommand = 'none',
  shouldResetRetries = false,
  shouldRetry?: 'pull' | 'push',
): SyncDecision {
  return { state, command, shouldResetRetries, shouldRetry }
}
