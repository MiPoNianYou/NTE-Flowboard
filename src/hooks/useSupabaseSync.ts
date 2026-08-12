import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { ChecklistData } from '../types'
import type { ChecklistSynchronizationPort } from '../utils/checklistController'
import {
  createCloudSynchronization,
  type CloudSynchronization,
  type CloudSynchronizationCommandResult,
} from '../utils/cloudSynchronization'

interface UseSupabaseSyncOptions {
  data: ChecklistData
  onDataImport: (data: ChecklistData) => void
  syncPort?: ChecklistSynchronizationPort
}

interface UseSupabaseSyncReturn {
  isConfigured: boolean
  syncStatus: ReturnType<CloudSynchronization['getSnapshot']>['syncStatus']
  lastSyncTime: string | null
  syncError: string | null
  hasPendingLocalChanges: boolean
  backgroundSyncStatus: ReturnType<CloudSynchronization['getSnapshot']>['backgroundSyncStatus']
  requiresDatabaseUpgrade: boolean
  setupSupabase: (projectUrl: string, anonKey: string) => Promise<CloudSynchronizationCommandResult>
  triggerSync: () => Promise<CloudSynchronizationCommandResult>
  teardownSupabase: () => void
  clearSyncError: () => void
}

export function useSupabaseSync({
  data,
  onDataImport,
  syncPort,
}: UseSupabaseSyncOptions): UseSupabaseSyncReturn {
  const onDataImportRef = useRef(onDataImport)
  const syncPortRef = useRef(syncPort)
  onDataImportRef.current = onDataImport
  syncPortRef.current = syncPort

  const synchronizationRef = useRef<CloudSynchronization | null>(null)
  if (!synchronizationRef.current) {
    synchronizationRef.current = createCloudSynchronization({
      initialData: data,
      getChecklistPort: () => syncPortRef.current,
      onDataImport: (remoteData) => onDataImportRef.current(remoteData),
    })
  }
  const synchronization = synchronizationRef.current
  const snapshot = useSyncExternalStore(
    synchronization.subscribe,
    synchronization.getSnapshot,
    synchronization.getSnapshot,
  )

  useEffect(() => {
    synchronization.start()
    return () => synchronization.stop()
  }, [synchronization])

  useEffect(() => {
    synchronization.updateLocalData(data)
  }, [data, synchronization])

  return {
    isConfigured: snapshot.isConfigured,
    syncStatus: snapshot.syncStatus,
    lastSyncTime: snapshot.lastSyncTime,
    syncError: snapshot.syncError,
    hasPendingLocalChanges: snapshot.hasPendingLocalChanges,
    backgroundSyncStatus: snapshot.backgroundSyncStatus,
    requiresDatabaseUpgrade: snapshot.requiresDatabaseUpgrade,
    setupSupabase: useCallback(
      (projectUrl, anonKey) => synchronization.configure(projectUrl, anonKey),
      [synchronization],
    ),
    triggerSync: useCallback(() => synchronization.syncNow(), [synchronization]),
    teardownSupabase: useCallback(() => synchronization.disconnect(), [synchronization]),
    clearSyncError: useCallback(() => synchronization.clearError(), [synchronization]),
  }
}
