export const CARD_STYLES = {
  /** 主面板卡片 — Halo 表面层 */
  panel:
    'bg-surface rounded-lg border border-border p-4 md:p-6 transition-colors duration-150',
  /** 设置区块卡片 — Halo 表面层 + 间距 */
  sectionSpaced:
    'bg-surface rounded-lg border border-border px-4 py-3 space-y-3 transition-colors duration-150',
  /** 浮起卡片 — Halo 浮起层 */
  elevated:
    'bg-elevated rounded-lg border border-border-strong p-6 shadow-md transition-colors duration-150',
} as const
