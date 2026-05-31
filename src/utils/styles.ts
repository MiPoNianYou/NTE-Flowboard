export const CARD_STYLES = {
  /** 主面板卡片（清单列表等） */
  panel:
    'bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/30 p-4 md:p-6 transition-shadow duration-300 hover:shadow-elevated',
  /** 设置区域卡片（云同步、重置等） */
  sectionSpaced:
    'bg-gray-50/80 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10 px-4 py-3 space-y-3 transition-shadow duration-300 hover:shadow-card',
} as const
