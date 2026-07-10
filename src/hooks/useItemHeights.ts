import { useRef, useCallback, useState } from 'react'
import type { TabType } from '../types'

type HeightMap = Map<string, number>

const STORAGE_KEY = 'flowboard-item-heights'
const SAVE_DEBOUNCE = 500

function loadCache(): Map<TabType, HeightMap> {
  const maps = new Map<TabType, HeightMap>()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      for (const tab of ['daily', 'weekly', 'monthly'] as TabType[]) {
        if (parsed[tab] && typeof parsed[tab] === 'object') {
          const map = new Map<string, number>()
          for (const [id, height] of Object.entries(parsed[tab])) {
            if (typeof height === 'number') {
              map.set(id, Math.round(height))
            }
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
