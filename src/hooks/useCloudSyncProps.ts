import { useMemo } from 'react'
import type { CloudSyncProps } from '../components/settings/CloudSyncSection'
import { useSupabaseSync } from './useSupabaseSync'
import type { ChecklistData, BehaviorSettings } from '../types'

interface UseCloudSyncPropsOptions {
  data: ChecklistData
  settings: BehaviorSettings
  onDataImport: (data: ChecklistData) => void
  onSettingsImport: (settings: BehaviorSettings) => void
}

export function useCloudSyncProps({
  data,
  settings,
  onDataImport,
  onSettingsImport,
}: UseCloudSyncPropsOptions): CloudSyncProps {
  const sync = useSupabaseSync({
    data,
    onDataImport,
    onSettingsImport,
    includeSettings: true,
    settings,
  })

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
