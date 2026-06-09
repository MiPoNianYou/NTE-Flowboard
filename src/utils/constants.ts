// --- Time durations (ms) ---
export const MS = {
  /** 重置检查轮询间隔（useChecklist） */
  RESET_POLL: 60_000,
  /** 倒计时标签刷新间隔（useNextResetLabel） */
  LABEL_REFRESH: 60_000,
  /** localStorage 防抖写入（storage.ts） */
  STORAGE_DEBOUNCE: 300,
  /** 同步推送防抖（useSupabaseSync） */
  PUSH_DEBOUNCE: 3_000,
  /** 同步错误恢复等待（useSupabaseSync） */
  ERROR_RECOVERY: 5_000,
  /** 定时拉取间隔（useSupabaseSync） */
  PERIODIC_PULL: 5 * 60_000,
  /** Realtime 变更防抖（useSupabaseSync） */
  REALTIME_DEBOUNCE: 500,
  /** 新增项动画窗口（useItemAnimation） */
  ANIMATION_WINDOW: 400,
  /** 删除确认超时（ChecklistItemRow） */
  DELETE_CONFIRM: 2_000,
  /** Toast 自动消失（StorageToast） */
  TOAST_DISMISS: 6_000,
  /** 操作成功提示消失（SettingsPanel / CloudSyncSection） */
  SUCCESS_HINT: 3_000,
} as const

// --- UI / Layout ---
export const UI = {
  /** 虚拟滚动启用阈值 */
  VIRTUAL_THRESHOLD: 50,
  /** 列表项估算高度（含间距）px */
  ESTIMATED_ITEM_HEIGHT: 52,
  /** 拖拽激活距离 px */
  DRAG_DISTANCE: 8,
  /** 虚拟列表最大高度 px */
  VIRTUAL_MAX_HEIGHT: 500,
  /** 虚拟列表底部额外间距 px */
  VIRTUAL_PADDING: 20,
  /** 单项目标签上限 */
  TAG_LIMIT: 5,
} as const
