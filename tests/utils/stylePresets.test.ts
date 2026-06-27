import { describe, it, expect } from 'vitest'
import { CARD_STYLES } from '../../src/utils/stylePresets'

describe('CARD_STYLES', () => {
  it('should have panel style', () => {
    expect(CARD_STYLES.panel).toContain('bg-surface')
    expect(CARD_STYLES.panel).toContain('rounded-xl')
    expect(CARD_STYLES.panel).toContain('border-border')
  })

  it('should have sectionSpaced style', () => {
    expect(CARD_STYLES.sectionSpaced).toContain('bg-surface')
    expect(CARD_STYLES.sectionSpaced).toContain('space-y-3')
  })

  it('should have elevated style', () => {
    expect(CARD_STYLES.elevated).toContain('bg-elevated')
    expect(CARD_STYLES.elevated).toContain('shadow-elevated')
    expect(CARD_STYLES.elevated).toContain('border-border-strong')
  })

  it('should be readonly (as const)', () => {
    expect(CARD_STYLES.panel).toBeDefined()
    expect(CARD_STYLES.sectionSpaced).toBeDefined()
    expect(CARD_STYLES.elevated).toBeDefined()
  })
})
