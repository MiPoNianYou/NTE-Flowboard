import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'

extend([a11yPlugin])

// ─── Base palette ───────────────────────────────────────────
export const PALETTE = {
  primary: '#5B6BFF',
  success: '#2BE08C',
  warning: '#F5D547',
  info:    '#3DD7E5',
  danger:  '#FF3A5C',
} as const

// ─── Soft variant alpha (dark theme optimized) ──────────────
const SOFT_ALPHA: Record<string, number> = {
  primary: 0.12,
  success: 0.12,
  warning: 0.14,
  info:    0.14,
  danger:  0.14,
}

// ─── Tag palette ────────────────────────────────────────────
export const TAG_HEX = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#EC4899', // Pink
] as const

// ─── Derived: soft variants ─────────────────────────────────
export function softColor(hex: string, alpha: number): string {
  return colord(hex).alpha(alpha).toHex()
}

// ─── Inject CSS custom properties at runtime ────────────────
export function injectColorTokens() {
  const root = document.documentElement
  for (const [name, hex] of Object.entries(PALETTE)) {
    const alpha = SOFT_ALPHA[name] ?? 0.12
    root.style.setProperty(`--color-${name}-soft`, softColor(hex, alpha))
  }
}

// ─── Page background gradient (shared by App + ErrorBoundary) ──
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
