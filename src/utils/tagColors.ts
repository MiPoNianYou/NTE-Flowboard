import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'
import labPlugin from 'colord/plugins/lab'
import { TAG_HEX } from './colors'

extend([a11yPlugin, labPlugin])

const STORAGE_KEY = 'flowboard-tag-colors'
const TAG_LIMIT = TAG_HEX.length
const MAX_GENERATION_ATTEMPTS = 32
const MIN_DISTANCE = 8
const MAX_DISTANCE = 18

type StoredAssignment = { kind: 'palette'; index: number } | { kind: 'generated'; hex: string }

let cachedMap: Map<string, StoredAssignment> | null = null

function getOptimalAlpha(hex: string): number {
  const luminance = colord(hex).luminance()
  return 0.12 + luminance * 0.15
}

const TAG_COLORS: [text: string, backgroundColor: string][] = TAG_HEX.map((hex) => {
  const backgroundColor = colord(hex).alpha(getOptimalAlpha(hex)).toHex()
  return [hex, backgroundColor]
})

function isPaletteAssignment(value: unknown): value is { kind: 'palette'; index: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'palette' &&
    typeof (value as { index?: unknown }).index === 'number'
  )
}

function isGeneratedAssignment(value: unknown): value is { kind: 'generated'; hex: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'generated' &&
    typeof (value as { hex?: unknown }).hex === 'string'
  )
}

function normalizeAssignment(value: unknown): StoredAssignment | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return { kind: 'palette', index: value }
  }
  if (isPaletteAssignment(value)) {
    return { kind: 'palette', index: value.index }
  }
  if (isGeneratedAssignment(value)) {
    return { kind: 'generated', hex: colord(value.hex).toHex() }
  }
  return null
}

function loadMap(): Map<string, StoredAssignment> {
  if (cachedMap) return cachedMap
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const entries: [string, StoredAssignment][] = []
        for (const entry of parsed) {
          if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') continue
          const assignment = normalizeAssignment(entry[1])
          if (assignment) entries.push([entry[0], assignment])
        }
        cachedMap = new Map(entries)
        return cachedMap
      }
    }
  } catch {
    void 0
  }
  cachedMap = new Map()
  return cachedMap
}

function saveMap(map: Map<string, StoredAssignment>) {
  cachedMap = map
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]))
  } catch {
    void 0
  }
}

function getNextAvailableColorIndex(map: Map<string, StoredAssignment>): number | null {
  const used = new Set<number>()
  for (const assignment of map.values()) {
    if (assignment.kind === 'palette') used.add(assignment.index)
  }
  for (let i = 0; i < TAG_LIMIT; i++) {
    if (!used.has(i)) return i
  }
  return null
}

function getTagColorByIndex(index: number): { text: string; backgroundColor: string } {
  const [text, backgroundColor] = TAG_COLORS[index % TAG_COLORS.length]
  return { text, backgroundColor }
}

function getAssignmentColors(assignment: StoredAssignment): {
  text: string
  backgroundColor: string
} {
  if (assignment.kind === 'palette') {
    return getTagColorByIndex(assignment.index)
  }
  return {
    text: assignment.hex,
    backgroundColor: colord(assignment.hex).alpha(getOptimalAlpha(assignment.hex)).toHex(),
  }
}

function getActiveCoreColors(map: Map<string, StoredAssignment>): string[] {
  const colors: string[] = []
  for (const assignment of map.values()) {
    if (assignment.kind === 'palette') {
      colors.push(getTagColorByIndex(assignment.index).text)
    } else {
      colors.push(assignment.hex)
    }
  }
  return colors
}

function getDistanceThreshold(activeTagCount: number): number {
  const overflowCount = Math.max(0, activeTagCount - TAG_LIMIT)
  return Math.max(MIN_DISTANCE, MAX_DISTANCE - overflowCount * 0.25)
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nextSeed(seed: number): number {
  let value = seed + 0x6d2b79f5
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return (value ^ (value >>> 14)) >>> 0
}

function seededFloat(seed: number): number {
  return nextSeed(seed) / 4294967296
}

function generateCandidateHex(tag: string, attempt: number): string {
  const baseSeed = hashString(`${tag}:${attempt}`)
  const hue = Math.floor(seededFloat(baseSeed) * 360)
  const saturation = 60 + Math.floor(seededFloat(baseSeed ^ 0x9e3779b9) * 18)
  const lightness = 46 + Math.floor(seededFloat(baseSeed ^ 0x85ebca6b) * 14)
  return colord({ h: hue, s: saturation, l: lightness }).toHex()
}

function getLabDistance(a: string, b: string): number {
  const left = colord(a).toLab()
  const right = colord(b).toLab()
  const dl = left.l - right.l
  const da = left.a - right.a
  const db = left.b - right.b
  return Math.sqrt(dl * dl + da * da + db * db)
}

function getMinDistance(candidate: string, existingColors: string[]): number {
  if (existingColors.length === 0) return Number.POSITIVE_INFINITY
  return Math.min(...existingColors.map((color) => getLabDistance(candidate, color)))
}

function isReadable(candidate: string): boolean {
  return colord(candidate).isReadable('#0d0d12', { level: 'AA', size: 'normal' })
}

function getCandidateScore(candidate: string, existingColors: string[]) {
  const minDistance = getMinDistance(candidate, existingColors)
  const contrast = colord(candidate).contrast('#0d0d12')
  return { candidate, minDistance, contrast }
}

function allocateGeneratedAssignment(
  tag: string,
  map: Map<string, StoredAssignment>,
): StoredAssignment {
  const existingColors = getActiveCoreColors(map)
  const activeCount = map.size + 1
  const baseThreshold = getDistanceThreshold(activeCount)
  let best: { candidate: string; minDistance: number; contrast: number } | null = null

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateCandidateHex(tag, attempt)
    if (!isReadable(candidate)) continue
    const score = getCandidateScore(candidate, existingColors)
    if (
      !best ||
      score.minDistance > best.minDistance ||
      (score.minDistance === best.minDistance && score.contrast > best.contrast)
    ) {
      best = score
    }
    const threshold = Math.max(MIN_DISTANCE, baseThreshold - Math.floor(attempt / 4))
    if (score.minDistance >= threshold) {
      return { kind: 'generated', hex: candidate }
    }
  }

  if (best) {
    return { kind: 'generated', hex: best.candidate }
  }

  return { kind: 'generated', hex: generateCandidateHex(tag, MAX_GENERATION_ATTEMPTS) }
}

function allocateAssignment(tag: string, map: Map<string, StoredAssignment>): StoredAssignment {
  const colorIndex = getNextAvailableColorIndex(map)
  if (colorIndex !== null) {
    return { kind: 'palette', index: colorIndex }
  }
  return allocateGeneratedAssignment(tag, map)
}

export function getTagColors(tag: string): { text: string; backgroundColor: string } {
  const map = loadMap()
  if (!map.has(tag)) {
    const assignment = allocateAssignment(tag, map)
    map.set(tag, assignment)
    saveMap(map)
  }
  return getAssignmentColors(map.get(tag)!)
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
