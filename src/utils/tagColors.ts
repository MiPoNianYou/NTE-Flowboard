import { colord } from './colors'
import { TAG_HEX } from './colors'

const STORAGE_KEY = 'flowboard-tag-colors'

let cachedMap: Map<string, number> | null = null

function getOptimalAlpha(hex: string): number {
  const luminance = colord(hex).luminance()
  return 0.12 + luminance * 0.15
}

const TAG_COLORS: [text: string, backgroundColor: string][] = TAG_HEX.map((hex) => {
  const backgroundColor = colord(hex).alpha(getOptimalAlpha(hex)).toHex()
  return [hex, backgroundColor]
})

function loadMap(): Map<string, number> {
  if (cachedMap) return cachedMap
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      cachedMap = new Map(JSON.parse(raw))
      return cachedMap
    }
  } catch {
    /* 数据损坏，重新开始 */
  }
  cachedMap = new Map()
  return cachedMap
}

function saveMap(map: Map<string, number>) {
  cachedMap = map
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]))
  } catch {
    /* 存储已满或不可用，静默忽略 */
  }
}

export function getTagColors(tag: string): { text: string; backgroundColor: string } {
  const map = loadMap()
  if (!map.has(tag)) {
    const used = new Set(map.values())
    let colorIndex = -1
    for (let i = 0; i < TAG_COLORS.length; i++) {
      if (!used.has(i)) {
        colorIndex = i
        break
      }
    }
    if (colorIndex === -1) colorIndex = map.size % TAG_COLORS.length
    map.set(tag, colorIndex)
    saveMap(map)
  }
  const [text, backgroundColor] = TAG_COLORS[map.get(tag)! % TAG_COLORS.length]
  return { text, backgroundColor }
}

export function cleanupRegistry(activeTags: string[]) {
  const map = loadMap()
  const used = new Set(activeTags)
  let hasChanged = false
  for (const tag of map.keys()) {
    if (!used.has(tag)) {
      map.delete(tag)
      hasChanged = true
    }
  }
  if (hasChanged) saveMap(map)
}
