export interface ChecklistItem {
  text: string
  completed: boolean
  hidden: boolean
  order: number
  tags: string[]
}

export type TabType = 'daily' | 'weekly' | 'custom'

export type CustomResetMode = 'daily' | 'weekly'

export type ServerRegion = 'asia' | 'america' | 'europe'

export interface ResetConfig {
  serverRegion: ServerRegion
}

export interface BehaviorSettings {
  autoMoveCompleted: boolean
  confirmDelete: boolean
  showCustomTab: boolean
}

export interface ChecklistData {
  daily: ChecklistItem[]
  weekly: ChecklistItem[]
  custom: ChecklistItem[]
  resetConfig: ResetConfig
  lastDailyReset: string // ISO date string
  lastWeeklyReset: string // ISO date string
  lastCustomReset?: string // ISO date string
  customResetMode?: CustomResetMode
  customName?: string
  settings?: BehaviorSettings
}

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'

export interface CloudSyncBaseProps {
  syncStatus: SyncStatus
  lastSyncTime: string | null
  syncError: string | null
  isConfigured: boolean
  onSetupSupabase: (projectId: string, anonKey: string) => Promise<void>
  onTriggerSync: () => Promise<void>
  onConfirmDisconnect: () => void
}

export interface CloudSyncProps extends CloudSyncBaseProps {
  onRequestDisconnect: () => void
  onCancelDisconnect: () => void
  showDisconnectConfirm: boolean
}

export interface SettingsProps {
  autoMoveCompleted: boolean
  onAutoMoveCompletedChange: (newVal: boolean) => void
  confirmDelete: boolean
  onConfirmDeleteChange: (newVal: boolean) => void
  cloudSyncBehavior: boolean
  onCloudSyncBehaviorChange: (value: boolean) => void
  showCustomTab: boolean
  onShowCustomTabChange: (value: boolean) => void
}
