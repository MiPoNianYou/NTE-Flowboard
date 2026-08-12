import { useEffect, memo } from 'react'
import type { SyncStatus } from '../../types'
import { CloudSyncSetup } from './CloudSyncSetup'
import { CloudSyncStatus } from './CloudSyncStatus'
import type {
  CloudBackgroundSyncStatus,
  CloudSynchronizationCommandResult,
} from '../../utils/cloudSynchronization'

export interface CloudSyncProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  isConfigured: boolean
  hasPendingLocalChanges?: boolean
  backgroundSyncStatus?: CloudBackgroundSyncStatus
  requiresDatabaseUpgrade?: boolean
  onSetupSupabase: (
    projectUrl: string,
    anonKey: string,
  ) => Promise<CloudSynchronizationCommandResult>
  onTriggerSync: () => Promise<CloudSynchronizationCommandResult>
  onTeardownSupabase: () => void
  onClearSyncError?: () => void
  mobile?: boolean
}

export const CloudSyncSection = memo(function CloudSyncSection({
  syncStatus,
  lastSyncTime,
  syncError,
  isConfigured,
  hasPendingLocalChanges = false,
  backgroundSyncStatus = 'ready',
  requiresDatabaseUpgrade = false,
  onSetupSupabase,
  onTriggerSync,
  onTeardownSupabase,
  onClearSyncError,
  mobile = false,
}: CloudSyncProps) {
  useEffect(() => {
    return () => {
      onClearSyncError?.()
    }
  }, [onClearSyncError])

  if (!isConfigured) {
    return <CloudSyncSetup onSetupSupabase={onSetupSupabase} mobile={mobile} />
  }

  return (
    <CloudSyncStatus
      syncStatus={syncStatus}
      lastSyncTime={lastSyncTime}
      syncError={syncError}
      hasPendingLocalChanges={hasPendingLocalChanges}
      backgroundSyncStatus={backgroundSyncStatus}
      requiresDatabaseUpgrade={requiresDatabaseUpgrade}
      onTriggerSync={onTriggerSync}
      onTeardownSupabase={onTeardownSupabase}
      mobile={mobile}
    />
  )
})
