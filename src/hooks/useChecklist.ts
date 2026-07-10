import { useState, useEffect, useCallback } from 'react'
import type {
  ChecklistData,
  BehaviorSettings,
  UiPreferences,
  ServerRegion,
  TabType,
} from '../types'
import { MS } from '../utils/constants'
import { loadData, saveData, saveDataImmediate, resetItems } from '../utils/storage'
import { shouldResetDaily, shouldResetWeekly, shouldResetMonthly } from '../utils/timezone'
import { useVisibilityInterval } from './useVisibilityInterval'
import { generateId } from '../utils/id'

function applyReset(data: ChecklistData, serverRegion: ServerRegion): ChecklistData {
  let shouldUpdate = false
  const next = { ...data }
  if (shouldResetDaily(data.lastDailyReset, serverRegion)) {
    next.daily = resetItems(data.daily)
    next.lastDailyReset = new Date().toISOString()
    shouldUpdate = true
  }
  if (shouldResetWeekly(data.lastWeeklyReset, serverRegion)) {
    next.weekly = resetItems(data.weekly)
    next.lastWeeklyReset = new Date().toISOString()
    shouldUpdate = true
  }
  if (shouldResetMonthly(data.lastMonthlyReset, serverRegion)) {
    next.monthly = resetItems(data.monthly)
    next.lastMonthlyReset = new Date().toISOString()
    shouldUpdate = true
  }
  return shouldUpdate ? next : data
}

export function useChecklist() {
  const [data, setData] = useState<ChecklistData>(() => {
    const loaded = loadData()
    return applyReset(loaded, loaded.settings.serverRegion)
  })

  const settings: BehaviorSettings = data.settings

  const uiPreferences: UiPreferences = data.uiPreferences

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    const handleBeforeUnload = () => saveDataImmediate(data)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [data])

  useVisibilityInterval(() => {
    setData((prev) => applyReset(prev, prev.settings.serverRegion))
  }, MS.RESET_POLL)

  const updateSettings = useCallback((partial: Partial<BehaviorSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }))
  }, [])

  const updateUiPreferences = useCallback((partial: Partial<UiPreferences>) => {
    setData((prev) => ({
      ...prev,
      uiPreferences: { ...prev.uiPreferences, ...partial },
    }))
  }, [])

  const toggleItem = useCallback((tab: TabType, id: string) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item,
      ),
    }))
  }, [])

  const addItem = useCallback((tab: TabType, text: string, tags: string[]) => {
    setData((prev) => {
      const items = prev[tab]
      const maxOrder = items.reduce(
        (maximum, item) => (item.order > maximum ? item.order : maximum),
        0,
      )
      const nextOrder = maxOrder + 1
      return {
        ...prev,
        [tab]: [
          ...items,
          { id: generateId(), text, isCompleted: false, isHidden: false, order: nextOrder, tags },
        ],
      }
    })
  }, [])

  const editItem = useCallback((tab: TabType, id: string, text: string, tags: string[]) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => (item.id === id ? { ...item, text, tags } : item)),
    }))
  }, [])

  const removeItem = useCallback((tab: TabType, id: string) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((item) => item.id !== id),
    }))
  }, [])

  const hideItem = useCallback((tab: TabType, id: string) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => (item.id === id ? { ...item, isHidden: true } : item)),
    }))
  }, [])

  const showItem = useCallback((tab: TabType, id: string) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => (item.id === id ? { ...item, isHidden: false } : item)),
    }))
  }, [])

  const reorderItem = useCallback((tab: TabType, activeId: string, overId: string) => {
    setData((prev) => {
      const items = [...prev[tab]].sort((leftItem, rightItem) => leftItem.order - rightItem.order)
      const oldIndex = items.findIndex((item) => item.id === activeId)
      const newIndex = items.findIndex((item) => item.id === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev
      const [moved] = items.splice(oldIndex, 1)
      items.splice(newIndex, 0, moved)
      const reordered = items.map((item, index) => ({ ...item, order: index + 1 }))
      return { ...prev, [tab]: reordered }
    })
  }, [])

  const manualReset = useCallback((tab: TabType) => {
    setData((prev) => ({
      ...prev,
      [tab]: resetItems(prev[tab]),
      ...(tab === 'daily'
        ? { lastDailyReset: new Date().toISOString() }
        : tab === 'weekly'
          ? { lastWeeklyReset: new Date().toISOString() }
          : { lastMonthlyReset: new Date().toISOString() }),
    }))
  }, [])

  const importFullData = useCallback((imported: ChecklistData) => {
    setData(imported)
  }, [])

  return {
    data,
    settings,
    updateSettings,
    uiPreferences,
    updateUiPreferences,
    toggleItem,
    addItem,
    editItem,
    removeItem,
    hideItem,
    showItem,
    reorderItem,
    manualReset,
    importFullData,
  }
}
