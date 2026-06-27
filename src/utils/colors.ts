import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'

extend([a11yPlugin])

export { colord }

// ─── 基础调色板（Liquid Glass 虹彩风格 — 唯一数据源）───────
// DESIGN.md §14: HSL 饱和度上限 80%
export const PALETTE = {
  primary: colord('#9080F0').toHex(),
  success: colord('#14AD81').toHex(),
  warning: colord('#E0A030').toHex(),
  info: colord('#15A0B8').toHex(),
  danger: colord('#E85252').toHex(),
}

// ─── 柔和变体透明度 ──────────────────────────────────────────
const SOFT_ALPHA: Record<string, number> = {
  primary: 0.12,
  success: 0.12,
  warning: 0.14,
  info: 0.14,
  danger: 0.14,
}

// ─── 标签调色板（DESIGN.md §14: HSL 饱和度≤80%）──────────
export const TAG_HEX = [
  colord('#E85252').toHex(), // red ~80%
  colord('#E88030').toHex(), // orange ~80%
  colord('#D4A020').toHex(), // yellow ~80%
  colord('#7CB820').toHex(), // lime ~78%
  colord('#22C55E').toHex(), // green ~71%
  colord('#18B0A0').toHex(), // teal ~78%
  colord('#6868E8').toHex(), // indigo ~80%
  colord('#4080E0').toHex(), // blue ~78%
  colord('#9850E0').toHex(), // purple ~78%
  colord('#D84080').toHex(), // pink ~78%
]

// ─── 背景渐变色板 ───────────────────────────────────────────
const BACKGROUND_PALETTE = {
  base: colord('#0D0D12').toHex(),
  subtle: colord('#0A0C14').toHex(),
  muted: colord('#0F1118').toHex(),
}

// ─── 虹彩渐变色板 (DESIGN.md §14: HSL 饱和度≤80%) ────────
const IRIDESCENT_PALETTE = [
  colord('#E01868').toHex(), // ~80%
  colord('#1868E0').toHex(), // ~80%
  colord('#6818E0').toHex(), // ~80%
]

// ─── 装饰径向渐变色板（复用 TAG_HEX）───────────────────────
const AMBIENT_PALETTE = [PALETTE.primary, TAG_HEX[7], TAG_HEX[9]]

// ─── 基础白色（用于表面/玻璃/边框/文本透明度）─────────────
const WHITE = colord('#FFFFFF').toHex()
const CHARCOAL = colord('#0A0A0A').toHex()

// ─── 派生：柔和变体 ──────────────────────────────────────────
export function softColor(hex: string, alpha: number): string {
  return colord(hex).alpha(alpha).toHex()
}

// ─── 运行时注入 CSS 自定义属性（所有路径经过 colord()）───
export function injectColorTokens() {
  const root = document.documentElement

  // ─── 语义色：base / hover / pressed / soft / glow ──────
  for (const [name, hex] of Object.entries(PALETTE)) {
    const alpha = SOFT_ALPHA[name] ?? 0.12
    root.style.setProperty(`--color-${name}`, colord(hex).toHex())
    root.style.setProperty(`--color-${name}-hover`, colord(hex).lighten(0.12).toHex())
    root.style.setProperty(`--color-${name}-pressed`, colord(hex).darken(0.08).toHex())
    root.style.setProperty(`--color-${name}-soft`, colord(hex).alpha(alpha).toHex())
    root.style.setProperty(`--color-${name}-glow`, colord(hex).alpha(0.3).toHex())
  }

  // ─── 背景色 ───────────────────────────────────────────
  root.style.setProperty('--color-background', colord(BACKGROUND_PALETTE.base).toHex())
  root.style.setProperty('--color-background-subtle', colord(BACKGROUND_PALETTE.subtle).toHex())
  root.style.setProperty('--color-background-muted', colord(BACKGROUND_PALETTE.muted).toHex())

  // ─── 表面色（白色 + 透明度）──────────────────────────
  root.style.setProperty('--color-surface', colord(WHITE).alpha(0.05).toHex())
  root.style.setProperty('--color-surface-hover', colord(WHITE).alpha(0.08).toHex())
  root.style.setProperty('--color-elevated', colord(WHITE).alpha(0.1).toHex())
  root.style.setProperty('--color-overlay', colord(BACKGROUND_PALETTE.base).alpha(0.8).toHex())

  // ─── 玻璃效果 ─────────────────────────────────────────
  root.style.setProperty('--color-glass', colord(WHITE).alpha(0.05).toHex())
  root.style.setProperty('--color-glass-border', colord(WHITE).alpha(0.1).toHex())
  root.style.setProperty('--color-glass-strong', colord(WHITE).alpha(0.08).toHex())

  // ─── 边框 ─────────────────────────────────────────────
  root.style.setProperty('--color-border', colord(WHITE).alpha(0.08).toHex())
  root.style.setProperty('--color-border-strong', colord(WHITE).alpha(0.15).toHex())
  root.style.setProperty('--color-border-soft', colord(WHITE).alpha(0.04).toHex())

  // ─── 文本色 ───────────────────────────────────────────
  root.style.setProperty('--color-text-primary', colord(WHITE).alpha(0.95).toHex())
  root.style.setProperty('--color-text-secondary', colord(WHITE).alpha(0.65).toHex())
  root.style.setProperty('--color-text-muted', colord(WHITE).alpha(0.4).toHex())

  // ─── 虹彩渐变 ─────────────────────────────────────────
  IRIDESCENT_PALETTE.forEach((hex, index) => {
    root.style.setProperty(`--color-iridescent-${index + 1}`, colord(hex).alpha(0.3).toHex())
  })

  // ─── 装饰径向渐变 ─────────────────────────────────────
  const ambientAlphas = [0.06, 0.04, 0.03]
  AMBIENT_PALETTE.forEach((hex, index) => {
    root.style.setProperty(
      `--color-ambient-${index + 1}`,
      colord(hex).alpha(ambientAlphas[index]).toHex(),
    )
  })

  // ─── 阴影 ─────────────────────────────────────────────
  root.style.setProperty('--shadow-sm', `0 1px 2px ${colord(CHARCOAL).alpha(0.2).toHex()}`)
  root.style.setProperty('--shadow-md', `0 4px 16px ${colord(CHARCOAL).alpha(0.3).toHex()}`)
  root.style.setProperty('--shadow-lg', `0 12px 40px ${colord(CHARCOAL).alpha(0.4).toHex()}`)
  root.style.setProperty(
    '--shadow-glass',
    `0 8px 32px ${colord(CHARCOAL).alpha(0.3).toHex()}, inset 0 1px 0 ${colord(WHITE).alpha(0.1).toHex()}`,
  )
  root.style.setProperty(
    '--shadow-glass-hover',
    `0 12px 40px ${colord(CHARCOAL).alpha(0.4).toHex()}, inset 0 1px 0 ${colord(WHITE).alpha(0.15).toHex()}`,
  )
  root.style.setProperty('--shadow-card', `0 2px 12px ${colord(CHARCOAL).alpha(0.06).toHex()}`)
  root.style.setProperty('--shadow-card-hover', `0 4px 20px ${colord(CHARCOAL).alpha(0.1).toHex()}`)
  root.style.setProperty('--shadow-elevated', `0 12px 40px ${colord(CHARCOAL).alpha(0.4).toHex()}`)
}

// ─── 页面背景渐变（所有路径经过 colord()）─────────────────
export function pageGradient(): string {
  return `linear-gradient(160deg, ${colord(BACKGROUND_PALETTE.subtle).toHex()} 0%, ${colord(BACKGROUND_PALETTE.base).toHex()} 40%, ${colord(BACKGROUND_PALETTE.muted).toHex()} 100%)`
}
