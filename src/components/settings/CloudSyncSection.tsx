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
  backgroundSyncStatus?: CloudBackgroundSyncStatus
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
  backgroundSyncStatus = 'ready',
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
      backgroundSyncStatus={backgroundSyncStatus}
      onTriggerSync={onTriggerSync}
      onTeardownSupabase={onTeardownSupabase}
      mobile={mobile}
    />
  )
})
