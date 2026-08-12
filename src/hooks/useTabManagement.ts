import { useState, useEffect, useCallback, useRef } from 'react'
import type { TabType } from '../types'
import { TAB_ORDER } from '../utils/constants'
import { migrateLegacyStorageValue } from '../utils/legacyStorageMigration'
import {
  reportLegacyStorageConflict,
  reportLegacyStorageFailure,
} from '../utils/legacyStorageEvents'

const parseTab = (raw: string): TabType | null =>
  raw === 'daily' || raw === 'weekly' || raw === 'monthly' ? raw : null

export type TabDirection = 'down' | 'up'

export function useTabManagement() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    migrateLegacyStorageValue(localStorage, {
      currentKey: 'flowboard-active-tab',
      legacyKey: 'nte-tab',
      parse: parseTab,
      serialize: (value) => value,
      equals: Object.is,
      onConflict: reportLegacyStorageConflict,
      onFailure: reportLegacyStorageFailure,
    })
    return parseTab(localStorage.getItem('flowboard-active-tab') ?? '') ?? 'daily'
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
