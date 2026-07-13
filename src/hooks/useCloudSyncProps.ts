import { useMemo } from 'react'
import type { CloudSyncProps } from '../components/settings/CloudSyncSection'
import { useSupabaseSync } from './useSupabaseSync'
import type { ChecklistData } from '../types'

interface UseCloudSyncPropsOptions {
  data: ChecklistData
  onDataImport: (data: ChecklistData) => void
  externalDataVersion: number
}

export function useCloudSyncProps({
  data,
  onDataImport,
  externalDataVersion,
}: UseCloudSyncPropsOptions): CloudSyncProps {
  const sync = useSupabaseSync({ data, onDataImport, externalDataVersion })

  return useMemo(
    () => ({
      syncStatus: sync.syncStatus,
      lastSyncTime: sync.lastSyncTime,
      syncError: sync.syncError,
      isConfigured: sync.isConfigured,
      onSetupSupabase: sync.setupSupabase,
      onTriggerSync: sync.triggerSync,
      onTeardownSupabase: sync.teardownSupabase,
      onClearSyncError: sync.clearSyncError,
    }),
    [
      sync.syncStatus,
      sync.lastSyncTime,
      sync.syncError,
      sync.isConfigured,
      sync.setupSupabase,
      sync.triggerSync,
      sync.teardownSupabase,
      sync.clearSyncError,
    ],
  )
}
