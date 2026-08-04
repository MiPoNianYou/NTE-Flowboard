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

export type ChecklistContentSnapshot = Pick<
  ChecklistData,
  ChecklistCycle | 'lastDailyReset' | 'lastWeeklyReset' | 'lastMonthlyReset'
>

export type ChecklistTransition =
  | { kind: 'add-item'; cycle: ChecklistCycle; item: ChecklistItem }
  | { kind: 'toggle-item'; cycle: ChecklistCycle; id: string }
  | { kind: 'set-item-completed'; cycle: ChecklistCycle; id: string; isCompleted: boolean }
  | { kind: 'edit-item'; cycle: ChecklistCycle; id: string; text: string; tags: string[] }
  | { kind: 'remove-item'; cycle: ChecklistCycle; id: string }
  | { kind: 'set-item-hidden'; cycle: ChecklistCycle; id: string; isHidden: boolean }
  | { kind: 'reorder-item'; cycle: ChecklistCycle; activeId: string; overId: string }
  | { kind: 'manual-reset'; cycle: ChecklistCycle; now: Date }
  | { kind: 'apply-due-resets'; now: Date }
  | { kind: 'restore-checklist-content'; snapshot: ChecklistContentSnapshot }
  | { kind: 'replace-data'; data: ChecklistData }
  | { kind: 'update-settings'; partial: Partial<BehaviorSettings> }
  | { kind: 'update-ui-preferences'; partial: Partial<UiPreferences> }

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'

export type NotificationLeadHours = 1 | 3 | 6 | 12

export interface NotificationPreferences {
  beforeResetEnabled: boolean
  resetEnabled: boolean
  leadHours: NotificationLeadHours
}

export interface NotificationRuleRevisions {
  beforeReset: string
  reset: string
}

interface NotificationCycleStats {
  visibleTotal: number
  incomplete: number
  cycleStartedAt: string
}

export type NotificationStats = Record<ChecklistCycle, NotificationCycleStats>

export type NotificationSystemStatus =
  'unsupported' | 'checking' | 'disabled' | 'enabling' | 'enabled' | 'denied' | 'error'

export type NotificationErrorCode =
  | 'NOTIFICATION_CHECK_FAILED'
  | 'NOTIFICATION_SYNC_FAILED'
  | 'NOTIFICATION_ENABLE_FAILED'
  | 'NOTIFICATION_DISABLE_SYNC_FAILED'
  | 'NOTIFICATION_DISABLE_FAILED'
  | 'NOTIFICATION_TEST_FAILED'

export interface NotificationSettingsProps {
  status: NotificationSystemStatus
  preferences: NotificationPreferences
  error: NotificationErrorCode | null
  testCountdownSeconds: number
  isTestSending: boolean
  lastTestSucceeded: boolean
  testFailed: boolean
  updatePreferences: (partial: Partial<NotificationPreferences>) => void
  enable: () => Promise<void>
  disable: () => Promise<void>
  refresh: () => Promise<void>
  sendTest: () => Promise<void>
}
