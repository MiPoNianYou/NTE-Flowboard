const STORAGE_KEY = 'tag-color-map'

const TAG_COLORS: [text: string, bg: string][] = [
  ['var(--color-tag-1)', 'rgba(239, 68, 68, 0.14)'],
  ['var(--color-tag-2)', 'rgba(249, 115, 22, 0.14)'],
  ['var(--color-tag-3)', 'rgba(234, 179, 8, 0.14)'],
  ['var(--color-tag-4)', 'rgba(132, 204, 22, 0.14)'],
  ['var(--color-tag-5)', 'rgba(34, 197, 94, 0.14)'],
  ['var(--color-tag-6)', 'rgba(20, 184, 166, 0.14)'],
  ['var(--color-tag-7)', 'rgba(99, 102, 241, 0.14)'],
  ['var(--color-tag-8)', 'rgba(59, 130, 246, 0.14)'],
  ['var(--color-tag-9)', 'rgba(168, 85, 247, 0.14)'],
  ['var(--color-tag-10)', 'rgba(236, 72, 153, 0.14)'],
]

function loadMap(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Map(JSON.parse(raw))
  } catch { /* corrupted data, start fresh */ }
  return new Map()
}

function saveMap(map: Map<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]))
  } catch { /* storage full or unavailable, silently ignore */ }
}

export function getTagColors(tag: string): { text: string; bg: string } {
  const map = loadMap()
  if (!map.has(tag)) {
    const used = new Set(map.values())
    let idx = -1
    for (let i = 0; i < TAG_COLORS.length; i++) {
      if (!used.has(i)) { idx = i; break }
    }
    if (idx === -1) idx = map.size % TAG_COLORS.length
    map.set(tag, idx)
    saveMap(map)
  }
  const [text, bg] = TAG_COLORS[map.get(tag)! % TAG_COLORS.length]
  return { text, bg }
}

export function cleanupRegistry(activeTags: string[]) {
  const map = loadMap()
  const used = new Set(activeTags)
  let changed = false
  for (const tag of map.keys()) {
    if (!used.has(tag)) {
      map.delete(tag)
      changed = true
    }
  }
  if (changed) saveMap(map)
}
