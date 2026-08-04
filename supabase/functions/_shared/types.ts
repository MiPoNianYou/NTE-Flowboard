export type Cycle = 'daily' | 'weekly' | 'monthly'
export type Region = 'asia' | 'america' | 'europe'
export type Locale = 'zh-CN' | 'en-US'
export type NotificationType = 'before-reset' | 'reset' | 'test'

interface CycleStats {
  visibleTotal: number
  incomplete: number
  cycleStartedAt: string
}

export type NotificationStats = Record<Cycle, CycleStats>

export interface SubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  server_region: Region
  locale: Locale
  before_reset_revision: string
  reset_revision: string
  created_at: string
  before_reset_enabled: boolean
  reset_enabled: boolean
  lead_hours: 1 | 3 | 6 | 12
  daily_visible_total: number
  daily_incomplete: number
  daily_cycle_started_at: string
  weekly_visible_total: number
  weekly_incomplete: number
  weekly_cycle_started_at: string
  monthly_visible_total: number
  monthly_incomplete: number
  monthly_cycle_started_at: string
}

export interface PushPayload {
  title: string
  body: string
  tag: string
  expiresAt: string
  issuedAt: string
  notificationType: NotificationType
  locale: Locale
  cycles: Cycle[]
  cycleExpiresAt?: Partial<Record<Cycle, string>>
  subscriptionId: string
  ruleRevisions: { beforeReset: string; reset: string }
}
