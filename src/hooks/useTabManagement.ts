import { useState, useEffect, useCallback, useRef } from 'react'
import type { TabType } from '../types'
import { TAB_ORDER } from '../utils/constants'

export type TabDirection = 'down' | 'up'

export function useTabManagement() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('flowboard-active-tab')
    return saved === 'daily' || saved === 'weekly' || saved === 'monthly'
      ? (saved as TabType)
      : 'daily'
  })

  const prevTabRef = useRef<TabType>(activeTab)
  const [direction, setDirection] = useState<TabDirection>('down')

  const changeTab = useCallback((tab: TabType) => {
    const prevOrder = TAB_ORDER[prevTabRef.current]
    const nextOrder = TAB_ORDER[tab]
    setDirection(nextOrder > prevOrder ? 'down' : 'up')
    prevTabRef.current = tab
    setActiveTab(tab)
  }, [])

  useEffect(() => {
    localStorage.setItem('flowboard-active-tab', activeTab)
  }, [activeTab])

  return {
    activeTab,
    setActiveTab: changeTab,
    direction,
  }
}
