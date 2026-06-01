import { describe, it, expect } from 'vitest'
import { getTagColor } from './tagColors'

describe('getTagColor', () => {
  it('should return a string', () => {
    expect(typeof getTagColor('test')).toBe('string')
  })

  it('should be deterministic — same input always gives same output', () => {
    const a = getTagColor('地图')
    const b = getTagColor('地图')
    expect(a).toBe(b)
  })

  it('should be cross-session stable — no dependency on call order', () => {
    // Call in different order, same tag should get same color
    const colors1 = ['A', 'B', 'C'].map(getTagColor)
    const colors2 = ['C', 'A', 'B'].map(getTagColor)

    expect(colors1[0]).toBe(colors2[1]) // A
    expect(colors1[1]).toBe(colors2[2]) // B
    expect(colors1[2]).toBe(colors2[0]) // C
  })

  it('should return valid CSS class strings', () => {
    const color = getTagColor('any-tag')
    expect(color).toContain('bg-tag-')
    expect(color).toContain('text-tag-')
  })

  it('should distribute tags across available colors', () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag-${i}`)
    const colors = tags.map(getTagColor)
    const uniqueColors = new Set(colors)
    // With 8 colors and 20 tags, we should see at least 4 different colors
    expect(uniqueColors.size).toBeGreaterThanOrEqual(4)
  })
})
