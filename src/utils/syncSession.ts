import type { ChecklistData, SyncStatus } from '../types'
import type { ChecklistController } from './checklistController'
import type { SupabaseConfig } from './supabase'
import { coordinateSync, type SyncCoordinationState, type SyncEvent } from './syncCoordinator'

interface SyncSessionResult {
  imported: boolean
  merged: boolean
}

export interface SyncSessionOptions {
  config: SupabaseConfig | null
  initialLastSeenTime: string | null
  syncPort?: ChecklistController['syncPort']
  pullRemote: (config: SupabaseConfig) => Promise<{ data: ChecklistData; updatedAt: string } | null>
  pushRemote: (config: SupabaseConfig, data: ChecklistData) => Promise<string>
  onDataImport: (data: ChecklistData) => void
  onRemoteApplied: () => void
  onLastSeen: (updatedAt: string) => void
  onStatus: (status: SyncStatus) => void
  onError: (error: unknown) => void
  onClearError: () => void
  onRetry: (kind: 'pull' | 'push') => void
  resetRetries: () => void
  broadcast: (updatedAt: string) => void
}

export interface SyncSession {
  setConfig: (config: SupabaseConfig | null) => void
  setSyncPort: (syncPort: ChecklistController['syncPort'] | undefined) => void
  getState: () => SyncCoordinationState
  markLocalChange: () => boolean
  pull: (force?: boolean, skipFirstImport?: boolean) => Promise<SyncSessionResult>
  push: (data: ChecklistData) => Promise<boolean>
}

export function createSyncSession(options: SyncSessionOptions): SyncSession {
  let config = options.config
  let configVersion = 0
  let mayUseInitialLastSeen = true
  let syncPort = options.syncPort
  let state: SyncCoordinationState = {
    syncStatus: config ? 'connecting' : 'disconnected',
    isPulling: false,
    hasLocalChanges: false,
    shouldSkipNextPush: false,
    lastSeenTime: options.initialLastSeenTime,
    isDataInitialized: false,
  }

  const coordinate = (event: SyncEvent) => {
    const decision = coordinateSync(state, event)
    state = decision.state
    options.onStatus(state.syncStatus)
    return decision
  }

  const fail = (error: unknown, kind: 'pull' | 'push') => {
    options.onError(error)
    const decision = coordinate({ kind: kind === 'pull' ? 'pull-failed' : 'push-failed' })
    if (decision.shouldRetry) options.onRetry(decision.shouldRetry)
  }

  const pull = async (force = false, skipFirstImport = false): Promise<SyncSessionResult> => {
    if (!config) return { imported: false, merged: false }
    const activeConfig = config
    const activeConfigVersion = configVersion
    const decision = coordinate({ kind: 'request-pull', force })
    if (decision.command !== 'pull') return { imported: false, merged: false }

    try {
      const result = await options.pullRemote(activeConfig)
      if (activeConfigVersion !== configVersion) return { imported: false, merged: false }
      if (!result) {
        const empty = coordinate({ kind: 'pull-empty' })
        if (empty.shouldResetRetries) options.resetRetries()
        options.onClearError()
        return { imported: false, merged: false }
      }

      const pullDecision = coordinate({
        kind: 'pull-succeeded',
        data: result.data,
        updatedAt: result.updatedAt,
        skipFirstImport,
        pushAfterPull: false,
      })
      const shouldImport = pullDecision.command === 'import-remote'
      let imported = false
      let merged = false

      if (shouldImport && syncPort) {
        const externalResult = await syncPort.applyExternalSnapshot({
          data: { ...result.data },
          revision: {
            counter: Date.parse(result.updatedAt) || Date.now(),
            writerId: 'supabase',
          },
        })
        imported = externalResult.outcome !== 'ignored'
        merged = externalResult.outcome === 'merged'
      } else if (shouldImport) {
        options.onDataImport({ ...result.data })
        imported = true
      }
      if (imported) {
        coordinate({ kind: 'external-data-applied' })
        options.onRemoteApplied()
      }
      if (merged && syncPort) {
        await push(syncPort.captureSnapshot().data)
        return { imported, merged }
      }

      options.onLastSeen(result.updatedAt)
      options.resetRetries()
      options.onClearError()
      return { imported, merged }
    } catch (error) {
      if (activeConfigVersion !== configVersion) return { imported: false, merged: false }
      fail(error, 'pull')
      return { imported: false, merged: false }
    }
  }

  const push = async (data: ChecklistData): Promise<boolean> => {
    if (!config) return false
    const activeConfig = config
    const activeConfigVersion = configVersion
    const decision = coordinate({ kind: 'request-push' })
    if (decision.command !== 'push') return false
    const captured = syncPort?.captureSnapshot()

    try {
      const updatedAt = await options.pushRemote(activeConfig, captured?.data ?? data)
      if (activeConfigVersion !== configVersion) return false
      options.onLastSeen(updatedAt)
      options.resetRetries()
      coordinate({ kind: 'push-succeeded', updatedAt })
      if (captured) syncPort?.acknowledgeOperationsThrough(captured.operationVersion)
      options.onClearError()
      options.broadcast(updatedAt)
      return true
    } catch (error) {
      if (activeConfigVersion !== configVersion) return false
      fail(error, 'push')
      return false
    }
  }

  return {
    setConfig: (nextConfig) => {
      const isSameConfig =
        config?.projectId === nextConfig?.projectId && config?.anonKey === nextConfig?.anonKey
      if (isSameConfig) return
      const lastSeenTime =
        config === null && nextConfig && mayUseInitialLastSeen ? state.lastSeenTime : null
      mayUseInitialLastSeen = false
      config = nextConfig
      configVersion += 1
      state = {
        ...state,
        isPulling: false,
        hasLocalChanges: false,
        shouldSkipNextPush: false,
        lastSeenTime,
        syncStatus: nextConfig ? 'connecting' : 'disconnected',
      }
      options.onStatus(state.syncStatus)
    },
    setSyncPort: (nextSyncPort) => {
      syncPort = nextSyncPort
    },
    getState: () => state,
    markLocalChange: () => coordinate({ kind: 'local-data-changed' }).command === 'schedule-push',
    pull,
    push,
  }
}
