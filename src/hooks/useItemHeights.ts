import { useRef, useCallback, useState } from 'react'
import type { TabType } from '../types'
import { migrateLegacyStorageValue } from '../utils/legacyStorageMigration'
import {
  reportLegacyStorageConflict,
  reportLegacyStorageFailure,
} from '../utils/legacyStorageEvents'

type HeightMap = Map<string, number>

const STORAGE_KEY = 'flowboard-item-heights'
const SAVE_DEBOUNCE = 500

function parseHeights(raw: string): Record<string, Record<string, number>> | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const result: Record<string, Record<string, number>> = {}
  for (const tab of ['daily', 'weekly', 'monthly']) {
    const values = (parsed as Record<string, unknown>)[tab]
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue
    const normalized: Record<string, number> = {}
    for (const [id, height] of Object.entries(values)) {
      if (typeof height === 'number' && Number.isFinite(height)) normalized[id] = Math.round(height)
    }
    if (Object.keys(normalized).length > 0) result[tab] = normalized
  }
  return result
}

function loadCache(): Map<TabType, HeightMap> {
  const maps = new Map<TabType, HeightMap>()
  try {
    migrateLegacyStorageValue(localStorage, {
      currentKey: STORAGE_KEY,
      legacyKey: 'nte-item-heights',
      parse: parseHeights,
      serialize: JSON.stringify,
      equals: (left, right) => JSON.stringify(left) === JSON.stringify(right),
      onConflict: reportLegacyStorageConflict,
      onFailure: reportLegacyStorageFailure,
    })
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsedValue = parseHeights(raw)
      if (!parsedValue) {
        const backupKey = `${STORAGE_KEY}-corrupted-backup`
        localStorage.setItem(backupKey, raw)
        if (localStorage.getItem(backupKey) !== raw) throw new Error('height backup failed')
      }
      const parsed = parsedValue ?? {}
      for (const tab of ['daily', 'weekly', 'monthly'] as TabType[]) {
        if (parsed[tab]) {
          const map = new Map<string, number>()
          for (const [id, height] of Object.entries(parsed[tab])) {
            map.set(id, height)
          }
          maps.set(tab, map)
        }
      }
    }
  } catch {
    void 0
  }
  return maps
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function saveCache(maps: Map<TabType, HeightMap>) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const data: Record<string, Record<string, number>> = {}
      for (const [tab, map] of maps) {
        data[tab] = {}
        for (const [id, height] of map) {
          data[tab][id] = height
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      void 0
    }
  }, SAVE_DEBOUNCE)
}

interface UseItemHeightsResult {
  reportHeight: (id: string, height: number) => void
  getHeight: (id: string) => number | undefined
}

export function useItemHeights(activeTab: TabType): UseItemHeightsResult {
  const cacheRef = useRef<Map<TabType, HeightMap>>(loadCache())
  const [, forceUpdate] = useState(0)

  const getMap = useCallback((tab: TabType): HeightMap => {
    let map = cacheRef.current.get(tab)
    if (!map) {
      map = new Map()
      cacheRef.current.set(tab, map)
    }
    return map
  }, [])

  const reportHeight = useCallback(
    (id: string, height: number) => {
      const map = getMap(activeTab)
      const prev = map.get(id)
      if (prev === undefined || Math.abs(prev - height) > 1) {
        map.set(id, Math.round(height))
        saveCache(cacheRef.current)
        forceUpdate((n) => n + 1)
      }
    },
    [activeTab, getMap],
  )

  const getHeight = useCallback(
    (id: string): number | undefined => {
      return getMap(activeTab).get(id)
    },
    [activeTab, getMap],
  )

  return { reportHeight, getHeight }
}
