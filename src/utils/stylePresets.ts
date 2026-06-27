export const CARD_STYLES = {
  /** 主面板卡片 — Liquid Glass 表面层 */
  panel:
    'bg-surface rounded-xl border border-border shadow-card p-4 md:p-6 transition-colors duration-[480ms]',
  /** 设置区块卡片 — Liquid Glass 表面层 + 间距 */
  sectionSpaced:
    'bg-surface rounded-xl border border-border shadow-card px-4 py-3 space-y-3 transition-colors duration-[480ms]',
  /** 浮起卡片 — Liquid Glass 浮起层 */
  elevated:
    'bg-elevated rounded-xl border border-border-strong p-6 shadow-elevated backdrop-blur-md transition-colors duration-[480ms]',
  /** 玻璃卡片 — Liquid Glass 虹彩效果 */
  glass: 'glass rounded-xl p-4 md:p-6 transition-colors duration-200',
} as const

/** 共享操作按钮 hover 样式 */
export const ACTION_HOVER_PRIMARY = 'p-1.5 hover:bg-primary/10 hover:text-primary'
export const ACTION_HOVER_WARNING = 'p-1.5 hover:bg-warning/10 hover:text-warning'
export const ACTION_HOVER_DANGER = 'p-1.5 hover:bg-danger/10 hover:text-danger'
export const ACTION_HOVER_SUCCESS = 'p-1.5 hover:bg-success/10 hover:text-success'
export const ACTION_HOVER_INFO = 'p-1.5 hover:bg-info/10 hover:text-info'
export const PENDING_DELETE_STYLE =
  'text-[var(--color-text-on-accent)] bg-danger hover:bg-danger hover:text-[var(--color-text-on-accent)]'

/** Grid collapse/expand 动画类 (DESIGN.md §13: 300ms) */
export const GRID_COLLAPSE =
  'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]'
