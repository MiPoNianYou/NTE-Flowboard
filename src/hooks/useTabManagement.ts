import { useState, useEffect } from 'react'
import type { TabType } from '../types'

export function useTabManagement() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('nte-tab')
    return saved === 'daily' || saved === 'weekly' || saved === 'custom' ? (saved as TabType) : 'daily'
  })

  useEffect(() => {
    localStorage.setItem('nte-tab', activeTab)
  }, [activeTab])

  return {
    activeTab,
    setActiveTab,
  }
}
