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
  beforeEach(() => {
    // Clear all injected styles
    const root = document.documentElement
    for (const name of Object.keys(PALETTE)) {
      root.style.removeProperty(`--color-${name}-soft`)
    }
  })

  it('should set CSS custom properties on :root', () => {
    injectColorTokens()
    for (const [name] of Object.entries(PALETTE)) {
      const value = document.documentElement.style.getPropertyValue(`--color-${name}-soft`)
      expect(value).toBeTruthy()
      expect(value).toMatch(/^#[0-9A-Fa-f]{8}$/)
    }
  })
})

describe('pageGradient', () => {
  it('should return a string containing radial-gradient', () => {
    const gradient = pageGradient()
    expect(gradient).toContain('radial-gradient')
  })

  it('should return a string containing linear-gradient', () => {
    const gradient = pageGradient()
    expect(gradient).toContain('linear-gradient')
  })

  it('should return multiple gradient layers separated by commas', () => {
    const gradient = pageGradient()
    const commaCount = (gradient.match(/,/g) || []).length
    expect(commaCount).toBeGreaterThanOrEqual(3)
  })
})
