import { colord } from 'colord'
import { describe, it, expect, beforeEach } from 'vitest'
import { getTagColors, cleanupRegistry } from '../../utils/tagColors'

function clearMap() {
  localStorage.removeItem('flowboard-tag-colors')
}

beforeEach(() => {
  clearMap()
  document.documentElement.dataset.theme = 'light'
})

describe('getTagColors', () => {
  it('should return text and backgroundColor as strings', () => {
    const { text, backgroundColor } = getTagColors('test')
    expect(typeof text).toBe('string')
    expect(typeof backgroundColor).toBe('string')
  })

  it('should be deterministic — same input always gives same output', () => {
    const a = getTagColors('地图')
    const b = getTagColors('地图')
    expect(a).toEqual(b)
  })

  it('should return valid color strings', () => {
    const { text, backgroundColor } = getTagColors('any-tag')
    expect(text).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(backgroundColor).toMatch(/^#[0-9A-Fa-f]{8}$/)
  })

  it('keeps tag text readable in the light theme without changing its assignment', () => {
    const light = getTagColors('contrast')
    document.documentElement.dataset.theme = 'dark'
    const dark = getTagColors('contrast')

    expect(colord(light.text).isReadable('#F4F6FB', { level: 'AA', size: 'normal' })).toBe(true)
    expect(colord(dark.text).isReadable('#0D0D12', { level: 'AA', size: 'normal' })).toBe(true)
    expect(light.text).not.toBe(dark.text)
  })

  it('should assign unique colors to different tags', () => {
    const tags = ['念柚', '测试', '五六七', '三四五', '地图', '方斯', '霸遇', '大亨']
    const colors = tags.map((t) => getTagColors(t).text)
    const unique = new Set(colors)
    expect(unique.size).toBe(tags.length)
  })

  it('should switch to generated colors after palette is full', () => {
    const tags = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11']
    const colors = tags.map((tag) => getTagColors(tag).text)

    expect(new Set(colors.slice(0, 10)).size).toBe(10)
    expect(colors[10]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(colors[10]).not.toBe(colors[0])
  })
})

describe('cleanupRegistry', () => {
  it('should remove unused tags from registry', () => {
    getTagColors('keep')
    getTagColors('remove')
    const before = localStorage.getItem('flowboard-tag-colors')
    expect(before).toContain('keep')
    expect(before).toContain('remove')

    cleanupRegistry(['keep'])

    const after = localStorage.getItem('flowboard-tag-colors')
    expect(after).toContain('keep')
    expect(after).not.toContain('remove')
  })

  it('should keep tag that still exists in another checklist', () => {
    getTagColors('shared')
    getTagColors('solo')
    cleanupRegistry(['shared', 'shared'])
    const after = localStorage.getItem('flowboard-tag-colors')
    expect(after).toContain('shared')
    expect(after).not.toContain('solo')
  })

  it('should handle empty active tags', () => {
    getTagColors('a')
    getTagColors('b')
    cleanupRegistry([])
    const after = localStorage.getItem('flowboard-tag-colors')
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
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    tags.forEach((t) => getTagColors(t))
    cleanupRegistry(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j'])
    const newColor = getTagColors('k').text
    const jColor = getTagColors('j').text
    expect(newColor).not.toBe(jColor)
  })

  it('should read legacy numeric storage format', () => {
    localStorage.setItem('flowboard-tag-colors', JSON.stringify([['legacy', 0]]))

    const colors = getTagColors('legacy')

    expect(colors.text).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(colors.backgroundColor).toMatch(/^#[0-9A-Fa-f]{8}$/)
  })
})
