import { describe, it, expect, beforeEach } from 'vitest'
import { getTagColors, cleanupRegistry } from './tagColors'

function clearMap() {
  localStorage.removeItem('tag-color-map')
}

beforeEach(() => {
  clearMap()
})

describe('getTagColors', () => {
  it('should return text and bg as strings', () => {
    const { text, bg } = getTagColors('test')
    expect(typeof text).toBe('string')
    expect(typeof bg).toBe('string')
  })

  it('should be deterministic — same input always gives same output', () => {
    const a = getTagColors('地图')
    const b = getTagColors('地图')
    expect(a).toEqual(b)
  })

  it('should return valid color strings', () => {
    const { text, bg } = getTagColors('any-tag')
    expect(text).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(bg).toMatch(/^#[0-9A-Fa-f]{8}$/)
  })

  it('should assign unique colors to different tags', () => {
    const tags = ['念柚', '测试', '五六七', '三四五', '地图', '方斯', '霸遇', '大亨']
    const colors = tags.map(t => getTagColors(t).text)
    const unique = new Set(colors)
    expect(unique.size).toBe(tags.length)
  })

  it('should persist assignments across calls', () => {
    const first = getTagColors('持久测试')
    const second = getTagColors('持久测试')
    expect(first).toEqual(second)
  })
})

describe('cleanupRegistry', () => {
  it('should remove unused tags from registry', () => {
    getTagColors('keep')
    getTagColors('remove')
    const before = localStorage.getItem('tag-color-map')
    expect(before).toContain('keep')
    expect(before).toContain('remove')

    cleanupRegistry(['keep'])

    const after = localStorage.getItem('tag-color-map')
    expect(after).toContain('keep')
    expect(after).not.toContain('remove')
  })

  it('should keep tag that still exists in another checklist', () => {
    getTagColors('shared')
    getTagColors('solo')
    cleanupRegistry(['shared', 'shared'])
    const after = localStorage.getItem('tag-color-map')
    expect(after).toContain('shared')
    expect(after).not.toContain('solo')
  })

  it('should handle empty active tags', () => {
    getTagColors('a')
    getTagColors('b')
    cleanupRegistry([])
    const after = localStorage.getItem('tag-color-map')
    expect(after).toBe('[]')
  })

  it('should not reassign colors to surviving tags after cleanup', () => {
    const a1 = getTagColors('alpha')
    const b1 = getTagColors('beta')
    getTagColors('gamma')

    cleanupRegistry(['alpha', 'beta'])

    const a2 = getTagColors('alpha')
    const b2 = getTagColors('beta')
    expect(a1).toEqual(a2)
    expect(b1).toEqual(b2)
  })

  it('should not collide after delete-and-add cycle', () => {
    const tags = ['a','b','c','d','e','f','g','h','i','j']
    tags.forEach(t => getTagColors(t))
    cleanupRegistry(['a','b','c','d','e','f','g','h','j'])
    const newColor = getTagColors('k').text
    const jColor = getTagColors('j').text
    expect(newColor).not.toBe(jColor)
  })
})
