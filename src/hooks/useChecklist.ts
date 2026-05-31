import { useState, useEffect, useCallback } from 'react'
import type { ChecklistData, ResetConfig, TabType } from '../types'
import {
  loadData,
  saveData,
  shouldResetDaily,
  shouldResetWeekly,
  resetItems,
} from '../utils/storage'

function applyReset(data: ChecklistData): ChecklistData {
  let needsUpdate = false
  const next = { ...data }
  if (shouldResetDaily(data)) {
    next.daily = resetItems(data.daily)
    next.lastDailyReset = new Date().toISOString()
    needsUpdate = true
  }
  if (shouldResetWeekly(data)) {
    next.weekly = resetItems(data.weekly)
    next.lastWeeklyReset = new Date().toISOString()
    needsUpdate = true
  }
  return needsUpdate ? next : data
}

export function useChecklist() {
  const [data, setData] = useState<ChecklistData>(() => applyReset(loadData()))

  // Persist on change (saveData has built-in 300ms debounce)
  useEffect(() => {
    saveData(data)
  }, [data])

  // Periodic reset check + visibility handling
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    function checkAndReset() {
      setData((prev) => applyReset(prev))
    }

    function startInterval() {
      if (interval) clearInterval(interval)
      interval = setInterval(checkAndReset, 60000)
    }

    function stopInterval() {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopInterval()
      } else {
        // 恢复时立即检查一次，再重启轮询
        checkAndReset()
        startInterval()
      }
    }

    // 初始启动
    startInterval()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const toggleItem = useCallback((tab: TabType, order: number) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) =>
        item.order === order ? { ...item, completed: !item.completed } : item,
      ),
    }))
  }, [])

  const addItem = useCallback((tab: TabType, text: string, tags: string[]) => {
    setData((prev) => {
      const items = prev[tab]
      const maxOrder = items.reduce((max, i) => (i.order > max ? i.order : max), 0)
      const nextOrder = maxOrder + 1
      return {
        ...prev,
        [tab]: [...items, { text, completed: false, hidden: false, order: nextOrder, tags }],
      }
    })
  }, [])

  const editItem = useCallback((tab: TabType, order: number, text: string, tags: string[]) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => (item.order === order ? { ...item, text, tags } : item)),
    }))
  }, [])

  const deleteItem = useCallback((tab: TabType, order: number) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((item) => item.order !== order),
    }))
  }, [])

  const hideItem = useCallback((tab: TabType, order: number) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => (item.order === order ? { ...item, hidden: true } : item)),
    }))
  }, [])

  const showItem = useCallback((tab: TabType, order: number) => {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => (item.order === order ? { ...item, hidden: false } : item)),
    }))
  }, [])

  const reorderItems = useCallback((tab: TabType, activeOrder: number, overOrder: number) => {
    setData((prev) => {
      const items = [...prev[tab]].sort((a, b) => a.order - b.order)
      const oldIndex = items.findIndex((item) => item.order === activeOrder)
      const newIndex = items.findIndex((item) => item.order === overOrder)
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
        : { lastWeeklyReset: new Date().toISOString() }),
    }))
  }, [])

  const importFullData = useCallback((imported: ChecklistData) => {
    setData(imported)
  }, [])

  const updateResetConfig = useCallback((config: ResetConfig) => {
    setData((prev) => ({
      ...prev,
      resetConfig: config,
    }))
  }, [])

  return {
    data,
    toggleItem,
    addItem,
    editItem,
    deleteItem,
    hideItem,
    showItem,
    reorderItems,
    manualReset,
    importFullData,
    updateResetConfig,
  }
}
