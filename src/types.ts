export interface ChecklistItem {
  id: string
  text: string
  isCompleted: boolean
  isHidden: boolean
  order: number
  tags: string[]
}

export type TabType = 'daily' | 'weekly' | 'monthly'

export type ServerRegion = 'asia' | 'america' | 'europe'

export interface BehaviorSettings {
  serverRegion: ServerRegion
  isAutoMoveEnabled: boolean
  shouldConfirmDelete: boolean
}

export interface UiPreferences {
  cloudPatchHidden: boolean
}

export interface ChecklistData {
  daily: ChecklistItem[]
  weekly: ChecklistItem[]
  monthly: ChecklistItem[]
  lastDailyReset: string
  lastWeeklyReset: string
  lastMonthlyReset: string
  settings: BehaviorSettings
  uiPreferences: UiPreferences
}

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'

// Re-export component prop types from their canonical locations
export type { CloudSyncProps } from './components/settings/CloudSyncSection'

export type { SettingsPageBaseProps } from './components/settings/SettingsPage'
export type { ItemActionProps } from './components/ChecklistItemRow/DesktopActions'
