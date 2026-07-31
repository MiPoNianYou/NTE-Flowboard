import { useMemo } from 'react'
import type { CloudSyncProps } from '../components/settings/CloudSyncSection'
import { useSupabaseSync } from './useSupabaseSync'
import type { ChecklistData } from '../types'
import type { ChecklistController } from '../utils/checklistController'

interface UseCloudSyncPropsOptions {
  data: ChecklistData
  onDataImport: (data: ChecklistData) => void
  syncPort?: ChecklistController['syncPort']
}

export function useCloudSyncProps({
  data,
  onDataImport,
  syncPort,
}: UseCloudSyncPropsOptions): CloudSyncProps {
  const sync = useSupabaseSync({ data, onDataImport, syncPort })

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
