const TAG_COLORS: [text: string, bg: string][] = [
  ['var(--color-primary)', 'var(--color-primary-soft)'],
  ['var(--color-tag-purple)', 'rgba(155, 107, 255, 0.14)'],
  ['var(--color-warning)', 'var(--color-warning-soft)'],
  ['var(--color-danger)', 'var(--color-danger-soft)'],
  ['var(--color-success)', 'var(--color-success-soft)'],
  ['var(--color-info)', 'var(--color-info-soft)'],
  ['var(--color-tag-indigo)', 'rgba(91, 107, 255, 0.14)'],
  ['var(--color-tag-pink)', 'rgba(255, 107, 157, 0.14)'],
  ['var(--color-tag-orange)', 'rgba(255, 159, 67, 0.14)'],
  ['var(--color-tag-cyan)', 'rgba(61, 215, 229, 0.14)'],
  ['var(--color-tag-rose)', 'rgba(255, 58, 92, 0.14)'],
  ['var(--color-tag-lime)', 'rgba(43, 224, 140, 0.14)'],
  ['var(--color-tag-violet)', 'rgba(155, 107, 255, 0.14)'],
  ['var(--color-tag-sky)', 'rgba(61, 215, 229, 0.14)'],
  ['var(--color-tag-fuchsia)', 'rgba(255, 107, 157, 0.14)'],
  ['var(--color-tag-emerald)', 'rgba(43, 224, 140, 0.14)'],
]

const tagColorMap = new Map<string, number>()
let nextIndex = 0

export function getTagColor(tag: string): string {
  if (!tagColorMap.has(tag)) {
    tagColorMap.set(tag, nextIndex % TAG_COLORS.length)
    nextIndex++
  }
  const [text] = TAG_COLORS[tagColorMap.get(tag)!]
  return text
}

export function getTagColors(tag: string): { bg: string; text: string } {
  getTagColor(tag)
  const [text, bg] = TAG_COLORS[tagColorMap.get(tag)!]
  return { text, bg }
}
