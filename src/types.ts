export interface ChecklistItem {
  text: string
  completed: boolean
  hidden: boolean
  order: number
  tags: string[]
}

export type TabType = 'daily' | 'weekly'

export type ServerRegion = 'asia' | 'america' | 'europe'

export interface ResetConfig {
  serverRegion: ServerRegion
}

export interface ChecklistData {
  daily: ChecklistItem[]
  weekly: ChecklistItem[]
  resetConfig: ResetConfig
  lastDailyReset: string // ISO date string
  lastWeeklyReset: string // ISO date string
}
