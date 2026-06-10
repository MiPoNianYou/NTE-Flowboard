import { useState, useEffect } from 'react'
import type { TabType } from '../types'

export function useTabManagement(showCustomTab: boolean) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('nte-tab')
    return saved === 'daily' || saved === 'weekly' || saved === 'custom' ? (saved as TabType) : 'daily'
  })

  const [previousTab, setPreviousTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('nte-previous-tab')
    return saved === 'daily' || saved === 'weekly' ? (saved as TabType) : 'daily'
  })

  // 同步计算有效 tab，避免两步渲染导致闪烁
  const effectiveActiveTab = (!showCustomTab && activeTab === 'custom') ? previousTab : activeTab

  useEffect(() => {
    localStorage.setItem('nte-tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    localStorage.setItem('nte-previous-tab', previousTab)
  }, [previousTab])

  return {
    activeTab,
    setActiveTab,
    effectiveActiveTab,
    previousTab,
    setPreviousTab,
  }
}
