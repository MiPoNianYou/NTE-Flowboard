export const MS = {
  RESET_POLL: 60_000,
  LABEL_REFRESH: 60_000,
  STORAGE_DEBOUNCE: 300,
  PUSH_DEBOUNCE: 3_000,
  ERROR_RECOVERY: 5_000,
  PERIODIC_PULL: 5 * 60_000,
  REALTIME_DEBOUNCE: 500,
  ANIMATION_WINDOW: 500,
  DELETE_CONFIRM: 2_000,
  TOAST_DISMISS: 6_000,
  SUCCESS_HINT: 3_000,
} as const

export const UI = {
  DRAG_DISTANCE: 8,
  TAG_LIMIT: 5,
} as const

import type { TabType } from '../types'

export const RESET_HOUR = 5

export const TAB_ORDER: Record<TabType, number> = { daily: 0, weekly: 1, monthly: 2 }
