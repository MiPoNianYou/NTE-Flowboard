import { useEffect, memo } from 'react'
import type { SyncStatus } from '../../types'
import { CloudSyncSetup } from './CloudSyncSetup'
import { CloudSyncStatus } from './CloudSyncStatus'

export interface CloudSyncProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  isConfigured: boolean
  onSetupSupabase: (projectUrl: string, anonKey: string) => Promise<void>
  onTriggerSync: () => Promise<void>
  onTeardownSupabase: () => void
  onClearSyncError?: () => void
  mobile?: boolean
}

export const CloudSyncSection = memo(function CloudSyncSection({
  syncStatus,
  lastSyncTime,
  syncError,
  isConfigured,
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
    return (
      <CloudSyncSetup syncError={syncError} onSetupSupabase={onSetupSupabase} mobile={mobile} />
    )
  }

  return (
    <CloudSyncStatus
      syncStatus={syncStatus}
      lastSyncTime={lastSyncTime}
      syncError={syncError}
      onTriggerSync={onTriggerSync}
      onTeardownSupabase={onTeardownSupabase}
      mobile={mobile}
    />
  )
})
