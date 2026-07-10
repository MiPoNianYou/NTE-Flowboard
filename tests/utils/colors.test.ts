import { describe, it, expect, beforeEach } from 'vitest'
import { softColor, injectColorTokens, pageGradient, PALETTE, TAG_HEX } from '../../src/utils/colors'

describe('PALETTE', () => {
  it('should have primary, success, warning, info, danger', () => {
    expect(PALETTE).toHaveProperty('primary')
    expect(PALETTE).toHaveProperty('success')
    expect(PALETTE).toHaveProperty('warning')
    expect(PALETTE).toHaveProperty('info')
    expect(PALETTE).toHaveProperty('danger')
  })

  it('all values should be valid hex colors', () => {
    for (const hex of Object.values(PALETTE)) {
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('TAG_HEX', () => {
  it('should have 10 colors', () => {
    expect(TAG_HEX).toHaveLength(10)
  })

  it('all should be valid hex colors', () => {
    for (const hex of TAG_HEX) {
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('softColor', () => {
  it('should return 8-char hex with alpha', () => {
    const result = softColor('#5B6BFF', 0.12)
    expect(result).toMatch(/^#[0-9A-Fa-f]{8}$/)
  })

  it('should produce different results for different alphas', () => {
    const light = softColor('#FF0000', 0.1)
    const dark = softColor('#FF0000', 0.5)
    expect(light).not.toBe(dark)
  })
})

describe('injectColorTokens', () => {
  const ALL_EXPECTED_VARS = [
    ...Object.keys(PALETTE).flatMap(name => [
      `--color-${name}`,
      `--color-${name}-hover`,
      `--color-${name}-pressed`,
      `--color-${name}-soft`,
      `--color-${name}-glow`,
    ]),
    '--color-background',
    '--color-background-subtle',
    '--color-background-muted',
    '--color-surface',
    '--color-surface-hover',
    '--color-elevated',
    '--color-overlay',
    '--color-glass',
    '--color-glass-border',
    '--color-glass-strong',
    '--color-border',
    '--color-border-strong',
    '--color-border-soft',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-muted',
    '--color-iridescent-1',
    '--color-iridescent-2',
    '--color-iridescent-3',
    '--color-ambient-1',
    '--color-ambient-2',
    '--color-ambient-3',
  ]

  beforeEach(() => {
    const root = document.documentElement
    for (const v of ALL_EXPECTED_VARS) {
      root.style.removeProperty(v)
    }
  })

  it('should set all semantic color tokens on :root', () => {
    injectColorTokens()
    for (const name of Object.keys(PALETTE)) {
      const hex = PALETTE[name as keyof typeof PALETTE].toLowerCase()
      expect(document.documentElement.style.getPropertyValue(`--color-${name}`)).toBe(hex)
      expect(document.documentElement.style.getPropertyValue(`--color-${name}-hover`)).toMatch(/^#[0-9a-f]{6}$/)
      expect(document.documentElement.style.getPropertyValue(`--color-${name}-pressed`)).toMatch(/^#[0-9a-f]{6}$/)
      expect(document.documentElement.style.getPropertyValue(`--color-${name}-soft`)).toMatch(/^#[0-9a-f]{8}$/)
      expect(document.documentElement.style.getPropertyValue(`--color-${name}-glow`)).toMatch(/^#[0-9a-f]{8}$/)
    }
  })

  it('should set background tokens', () => {
    injectColorTokens()
    expect(document.documentElement.style.getPropertyValue('--color-background')).toMatch(/^#[0-9a-f]{6}$/)
    expect(document.documentElement.style.getPropertyValue('--color-background-subtle')).toMatch(/^#[0-9a-f]{6}$/)
    expect(document.documentElement.style.getPropertyValue('--color-background-muted')).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('should set surface/glass/border/text tokens', () => {
    injectColorTokens()
    const tokens = [
      '--color-surface', '--color-surface-hover', '--color-elevated', '--color-overlay',
      '--color-glass', '--color-glass-border', '--color-glass-strong',
      '--color-border', '--color-border-strong', '--color-border-soft',
      '--color-text-primary', '--color-text-secondary', '--color-text-muted',
    ]
    for (const token of tokens) {
      const value = document.documentElement.style.getPropertyValue(token)
      expect(value).toBeTruthy()
    }
  })

  it('should set iridescent tokens', () => {
    injectColorTokens()
    for (let i = 1; i <= 3; i++) {
      const value = document.documentElement.style.getPropertyValue(`--color-iridescent-${i}`)
      expect(value).toMatch(/^#[0-9a-f]{8}$/)
    }
  })

  it('should set ambient tokens', () => {
    injectColorTokens()
    for (let i = 1; i <= 3; i++) {
      const value = document.documentElement.style.getPropertyValue(`--color-ambient-${i}`)
      expect(value).toMatch(/^#[0-9a-f]{8}$/)
    }
  })

  it('should set all expected variables (count check)', () => {
    injectColorTokens()
    for (const v of ALL_EXPECTED_VARS) {
      expect(document.documentElement.style.getPropertyValue(v)).toBeTruthy()
    }
  })
})

describe('pageGradient', () => {
  it('should return a string containing linear-gradient', () => {
    const gradient = pageGradient()
    expect(gradient).toContain('linear-gradient')
  })

  it('should return a valid CSS gradient string', () => {
    const gradient = pageGradient().toLowerCase()
    expect(gradient).toContain('linear-gradient')
    expect(gradient).toContain('#0a0c14')
  })

  it('should contain all three background palette colors', () => {
    const gradient = pageGradient().toLowerCase()
    expect(gradient).toContain('#0d0d12')
    expect(gradient).toContain('#0a0c14')
    expect(gradient).toContain('#0f1118')
  })

  it('should return a string that is not empty', () => {
    const gradient = pageGradient()
    expect(gradient.length).toBeGreaterThan(0)
  })
})
