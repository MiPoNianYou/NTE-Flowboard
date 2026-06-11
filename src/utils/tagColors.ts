import { colord } from './colors'
import { TAG_HEX } from './colors'

const STORAGE_KEY = 'tag-color-map'

function getOptimalAlpha(hex: string): number {
  const luminance = colord(hex).luminance()
  return 0.12 + luminance * 0.15
}

const TAG_COLORS: [text: string, bg: string][] = TAG_HEX.map((hex) => {
  const bg = colord(hex).alpha(getOptimalAlpha(hex)).toHex()
  return [hex, bg]
})

function loadMap(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Map(JSON.parse(raw))
  } catch { /* 数据损坏，重新开始 */ }
  return new Map()
}

function saveMap(map: Map<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]))
  } catch { /* 存储已满或不可用，静默忽略 */ }
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
