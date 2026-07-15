import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  BehaviorSettings,
  ChecklistData,
  ChecklistTransition,
  TabType,
  UiPreferences,
} from '../types'
import { MS } from '../utils/constants'
import {
  cancelPendingSave,
  isChecklistStorageKey,
  loadData,
  saveData,
  saveDataImmediate,
} from '../utils/storage'
import { applyChecklistTransition } from '../utils/checklistTransitions'
import { useVisibilityInterval } from './useVisibilityInterval'
import { generateId } from '../utils/id'

export function useChecklist() {
  const [data, setData] = useState<ChecklistData>(() => {
    const loaded = loadData()
    return applyChecklistTransition(loaded, { kind: 'apply-due-resets', now: new Date() })
  })

  const settings: BehaviorSettings = data.settings
  const uiPreferences: UiPreferences = data.uiPreferences
  const [externalDataVersion, setExternalDataVersion] = useState(0)
  const isApplyingExternalDataRef = useRef(false)

  const applyTransition = useCallback((transition: ChecklistTransition) => {
    setData((previous) => applyChecklistTransition(previous, transition))
  }, [])

  useEffect(() => {
    if (isApplyingExternalDataRef.current) {
      isApplyingExternalDataRef.current = false
      return
    }
    saveData(data)
  }, [data])

  useEffect(() => {
    const handleBeforeUnload = () => saveDataImmediate(data)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [data])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!isChecklistStorageKey(event.key)) return
      cancelPendingSave()
      isApplyingExternalDataRef.current = true
      applyTransition({ kind: 'replace-data', data: loadData() })
      setExternalDataVersion((version) => version + 1)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [applyTransition])

  useVisibilityInterval(() => {
    applyTransition({ kind: 'apply-due-resets', now: new Date() })
  }, MS.RESET_POLL)

  useEffect(() => {
    applyTransition({ kind: 'apply-due-resets', now: new Date() })
  }, [applyTransition, settings.serverRegion])

  const updateSettings = useCallback(
    (partial: Partial<BehaviorSettings>) => {
      applyTransition({ kind: 'update-settings', partial })
    },
    [applyTransition],
  )

  const updateUiPreferences = useCallback(
    (partial: Partial<UiPreferences>) => {
      applyTransition({ kind: 'update-ui-preferences', partial })
    },
    [applyTransition],
  )

  const toggleItem = useCallback(
    (tab: TabType, id: string) => {
      applyTransition({ kind: 'toggle-item', cycle: tab, id })
    },
    [applyTransition],
  )

  const addItem = useCallback(
    (tab: TabType, text: string, tags: string[]) => {
      applyTransition({
        kind: 'add-item',
        cycle: tab,
        item: { id: generateId(), text, isCompleted: false, isHidden: false, order: 0, tags },
      })
    },
    [applyTransition],
  )

  const editItem = useCallback(
    (tab: TabType, id: string, text: string, tags: string[]) => {
      applyTransition({ kind: 'edit-item', cycle: tab, id, text, tags })
    },
    [applyTransition],
  )

  const removeItem = useCallback(
    (tab: TabType, id: string) => {
      applyTransition({ kind: 'remove-item', cycle: tab, id })
    },
    [applyTransition],
  )

  const hideItem = useCallback(
    (tab: TabType, id: string) => {
      applyTransition({ kind: 'set-item-hidden', cycle: tab, id, isHidden: true })
    },
    [applyTransition],
  )

  const showItem = useCallback(
    (tab: TabType, id: string) => {
      applyTransition({ kind: 'set-item-hidden', cycle: tab, id, isHidden: false })
    },
    [applyTransition],
  )

  const reorderItem = useCallback(
    (tab: TabType, activeId: string, overId: string) => {
      applyTransition({ kind: 'reorder-item', cycle: tab, activeId, overId })
    },
    [applyTransition],
  )

  const manualReset = useCallback(
    (tab: TabType) => {
      applyTransition({ kind: 'manual-reset', cycle: tab, now: new Date() })
    },
    [applyTransition],
  )

  const importFullData = useCallback(
    (imported: ChecklistData) => {
      applyTransition({ kind: 'replace-data', data: imported })
    },
    [applyTransition],
  )

  return {
    data,
    externalDataVersion,
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
