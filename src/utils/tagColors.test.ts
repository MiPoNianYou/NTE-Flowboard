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

  it('should assign different colors to different tags', () => {
    const tags = ['霸遇', '方斯', '大亨', '地图', '普通']
    const colors = tags.map(getTagColor)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(tags.length)
  })

  it('should return valid CSS variable strings', () => {
    const color = getTagColor('any-tag')
    expect(color).toContain('var(--color-')
  })
})
