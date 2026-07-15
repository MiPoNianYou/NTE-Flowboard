export type TagCollectionResult =
  | { kind: 'added'; tags: string[] }
  | { kind: 'empty' | 'duplicate' | 'limit-reached'; tags: string[] }

export interface ChecklistItem {
  id: string
  text: string
  isCompleted: boolean
  isHidden: boolean
  order: number
  tags: string[]
}

export type TabType = 'daily' | 'weekly' | 'monthly'

export type ChecklistCycle = TabType

export interface ResetSchedule {
  previousResetAt: Date
  nextResetAt: Date
}

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

export type ChecklistTransition =
  | { kind: 'add-item'; cycle: ChecklistCycle; item: ChecklistItem }
  | { kind: 'toggle-item'; cycle: ChecklistCycle; id: string }
  | { kind: 'edit-item'; cycle: ChecklistCycle; id: string; text: string; tags: string[] }
  | { kind: 'remove-item'; cycle: ChecklistCycle; id: string }
  | { kind: 'set-item-hidden'; cycle: ChecklistCycle; id: string; isHidden: boolean }
  | { kind: 'reorder-item'; cycle: ChecklistCycle; activeId: string; overId: string }
  | { kind: 'manual-reset'; cycle: ChecklistCycle; now: Date }
  | { kind: 'apply-due-resets'; now: Date }
  | { kind: 'replace-data'; data: ChecklistData }
  | { kind: 'update-settings'; partial: Partial<BehaviorSettings> }
  | { kind: 'update-ui-preferences'; partial: Partial<UiPreferences> }

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'

export type { CloudSyncProps } from './components/settings/CloudSyncSection'

export type { SettingsPageBaseProps } from './components/settings/SettingsPage'
export type { ItemActionProps } from './components/ChecklistItemRow/DesktopActions'
