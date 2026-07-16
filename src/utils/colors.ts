import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'

extend([a11yPlugin])

export const PALETTE = {
  primary: colord('#9080F0').toHex(),
  success: colord('#14AD81').toHex(),
  warning: colord('#E0A030').toHex(),
  info: colord('#15A0B8').toHex(),
  danger: colord('#E85252').toHex(),
}

const SOFT_ALPHA: Record<string, number> = {
  primary: 0.12,
  success: 0.12,
  warning: 0.14,
  info: 0.14,
  danger: 0.14,
}

export const TAG_HEX = [
  colord('#E85252').toHex(),
  colord('#E88030').toHex(),
  colord('#D4A020').toHex(),
  colord('#7CB820').toHex(),
  colord('#22C55E').toHex(),
  colord('#18B0A0').toHex(),
  colord('#6868E8').toHex(),
  colord('#4080E0').toHex(),
  colord('#9850E0').toHex(),
  colord('#D84080').toHex(),
]

const BACKGROUND_PALETTE = {
  base: colord('#0D0D12').toHex(),
  subtle: colord('#0A0C14').toHex(),
  muted: colord('#0F1118').toHex(),
}

const IRIDESCENT_PALETTE = [
  colord('#E01868').toHex(),
  colord('#1868E0').toHex(),
  colord('#6818E0').toHex(),
]

const AMBIENT_PALETTE = [PALETTE.primary, TAG_HEX[7], TAG_HEX[9]]

const WHITE = colord('#FFFFFF').toHex()
const CHARCOAL = colord('#0A0A0A').toHex()

export function injectColorTokens() {
  const root = document.documentElement

  for (const [name, hex] of Object.entries(PALETTE)) {
    const alpha = SOFT_ALPHA[name] ?? 0.12
    root.style.setProperty(`--color-${name}`, colord(hex).toHex())
    root.style.setProperty(`--color-${name}-hover`, colord(hex).lighten(0.12).toHex())
    root.style.setProperty(`--color-${name}-pressed`, colord(hex).darken(0.08).toHex())
    root.style.setProperty(`--color-${name}-soft`, colord(hex).alpha(alpha).toHex())
    root.style.setProperty(`--color-${name}-glow`, colord(hex).alpha(0.3).toHex())
  }

  root.style.setProperty('--color-background', colord(BACKGROUND_PALETTE.base).toHex())
  root.style.setProperty('--color-background-subtle', colord(BACKGROUND_PALETTE.subtle).toHex())
  root.style.setProperty('--color-background-muted', colord(BACKGROUND_PALETTE.muted).toHex())

  root.style.setProperty('--color-surface', colord(WHITE).alpha(0.05).toHex())
  root.style.setProperty('--color-surface-hover', colord(WHITE).alpha(0.08).toHex())
  root.style.setProperty('--color-elevated', colord(WHITE).alpha(0.1).toHex())
  root.style.setProperty('--color-overlay', colord(BACKGROUND_PALETTE.base).alpha(0.8).toHex())

  root.style.setProperty('--color-glass', colord(WHITE).alpha(0.05).toHex())
  root.style.setProperty('--color-glass-border', colord(WHITE).alpha(0.1).toHex())
  root.style.setProperty('--color-glass-strong', colord(WHITE).alpha(0.08).toHex())

  root.style.setProperty('--color-border', colord(WHITE).alpha(0.08).toHex())
  root.style.setProperty('--color-border-strong', colord(WHITE).alpha(0.15).toHex())
  root.style.setProperty('--color-border-soft', colord(WHITE).alpha(0.04).toHex())

  root.style.setProperty('--color-text-primary', colord(WHITE).alpha(0.95).toHex())
  root.style.setProperty('--color-text-secondary', colord(WHITE).alpha(0.65).toHex())
  root.style.setProperty('--color-text-muted', colord(WHITE).alpha(0.4).toHex())

  IRIDESCENT_PALETTE.forEach((hex, index) => {
    root.style.setProperty(`--color-iridescent-${index + 1}`, colord(hex).alpha(0.3).toHex())
  })

  const ambientAlphas = [0.06, 0.04, 0.03]
  AMBIENT_PALETTE.forEach((hex, index) => {
    root.style.setProperty(
      `--color-ambient-${index + 1}`,
      colord(hex).alpha(ambientAlphas[index]).toHex(),
    )
  })

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

export function pageGradient(): string {
  return `linear-gradient(160deg, ${colord(BACKGROUND_PALETTE.subtle).toHex()} 0%, ${colord(BACKGROUND_PALETTE.base).toHex()} 40%, ${colord(BACKGROUND_PALETTE.muted).toHex()} 100%)`
}

export const PAGE_GRADIENT = pageGradient()
