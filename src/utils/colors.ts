import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'

extend([a11yPlugin])

export { colord }

// ─── 基础调色板 ──────────────────────────────────────────────
export const PALETTE = {
  primary: '#5B6BFF',
  success: '#2BE08C',
  warning: '#F5D547',
  info:    '#3DD7E5',
  danger:  '#FF3A5C',
} as const

// ─── 柔和变体透明度（暗色主题优化） ───────────────────────────
const SOFT_ALPHA: Record<string, number> = {
  primary: 0.12,
  success: 0.12,
  warning: 0.14,
  info:    0.14,
  danger:  0.14,
}

// ─── 标签调色板 ──────────────────────────────────────────────
export const TAG_HEX = [
  '#EF4444', // 红色
  '#F97316', // 橙色
  '#EAB308', // 黄色
  '#84CC16', // 黄绿
  '#22C55E', // 绿色
  '#14B8A6', // 青色
  '#6366F1', // 靛蓝
  '#3B82F6', // 蓝色
  '#A855F7', // 紫色
  '#EC4899', // 粉色
] as const

// ─── 派生：柔和变体 ──────────────────────────────────────────
export function softColor(hex: string, alpha: number): string {
  return colord(hex).alpha(alpha).toHex()
}

// ─── 运行时注入 CSS 自定义属性 ───────────────────────────────
export function injectColorTokens() {
  const root = document.documentElement
  for (const [name, hex] of Object.entries(PALETTE)) {
    const alpha = SOFT_ALPHA[name] ?? 0.12
    root.style.setProperty(`--color-${name}-soft`, softColor(hex, alpha))
  }
}

// ─── 页面背景渐变（App + ErrorBoundary 共用） ─────────────────
export function pageGradient(): string {
  const primary = colord(PALETTE.primary).alpha(0.22).toHex()
  const info    = colord(PALETTE.info).alpha(0.10).toHex()
  const danger  = colord(PALETTE.danger).alpha(0.05).toHex()
  return [
    `radial-gradient(900px 600px at 88% 12%, ${primary}, transparent 60%)`,
    `radial-gradient(700px 500px at 6% 92%, ${info}, transparent 60%)`,
    `radial-gradient(500px 400px at 60% 80%, ${danger}, transparent 60%)`,
    `linear-gradient(180deg, #0A0B0F 0%, #06070A 100%)`,
  ].join(', ')
}
