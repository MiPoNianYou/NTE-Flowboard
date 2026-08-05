import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { BehaviorSettings, ChecklistData, TabType, UiPreferences } from '../types'
import { MS } from '../utils/constants'
import { createChecklistController, type ChecklistController } from '../utils/checklistController'
import { createChecklistStorageAdapter } from '../utils/storage'
import { useVisibilityInterval } from './useVisibilityInterval'
import { generateId } from '../utils/id'
import { toastBus } from '../utils/toastBus'
import { createDefaultChecklistData } from '../utils/defaultData'
import { getEffectiveLocale } from '../i18n/displayPreferences'
import { createChecklistRestoreSessionStore } from '../utils/checklistRestoreBackup'
import i18n from '../i18n'

export function useChecklist() {
  const controllerRef = useRef<ChecklistController | null>(null)
  if (!controllerRef.current) {
    const initialData = (() => {
      const adapter = createChecklistStorageAdapter({
        createDefaultData: () => createDefaultChecklistData(getEffectiveLocale()),
      })
      const loaded = adapter.load()
      if (loaded.error) {
        toastBus.emit(i18n.t('storage.loadFailed'), 'error', i18n.t('storage.loadFailedTitle'))
      }
      const controller = createChecklistController({
        initialData: loaded.snapshot.data,
        adapter,
        restoreStore: createChecklistRestoreSessionStore(),
        createDefaultContent: (now) => {
          const defaults = createDefaultChecklistData(getEffectiveLocale())
          const timestamp = now.toISOString()
          return {
            daily: defaults.daily,
            weekly: defaults.weekly,
            monthly: defaults.monthly,
            lastDailyReset: timestamp,
            lastWeeklyReset: timestamp,
            lastMonthlyReset: timestamp,
          }
        },
        onConflict: (count) =>
          toastBus.emit(
            i18n.t('checklist.conflictSkipped', { count }),
            'error',
            i18n.t('checklist.conflictTitle'),
          ),
      })
      controller.applyDueResets(new Date())
      return controller
    })()
    controllerRef.current = initialData
  }

  const controller = controllerRef.current
  const data = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  const restoreState = useSyncExternalStore(
    controller.subscribe,
    controller.getRestoreState,
    controller.getRestoreState,
  )

  useEffect(() => {
    void controller.start()
    const handleBeforeUnload = () => controller.flushNow()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      controller.stop()
    }
  }, [controller])

  useVisibilityInterval(() => controller.applyDueResets(new Date()), MS.RESET_POLL)

  const settings: BehaviorSettings = data.settings
  const uiPreferences: UiPreferences = data.uiPreferences

  const updateSettings = useCallback(
    (partial: Partial<BehaviorSettings>) => {
      controller.updateSettings(partial)
      if (partial.serverRegion) controller.applyDueResets(new Date())
    },
    [controller],
  )
  const updateUiPreferences = useCallback(
    (partial: Partial<UiPreferences>) => controller.updateUiPreferences(partial),
    [controller],
  )
  const toggleItem = useCallback(
    (tab: TabType, id: string) => controller.toggleItem(tab, id),
    [controller],
  )
  const addItem = useCallback(
    (tab: TabType, text: string, tags: string[]) =>
      controller.addItem(tab, {
        id: generateId(),
        text,
        isCompleted: false,
        isHidden: false,
        order: 0,
        tags,
      }),
    [controller],
  )
  const editItem = useCallback(
    (tab: TabType, id: string, text: string, tags: string[]) =>
      controller.editItem(tab, id, text, tags),
    [controller],
  )
  const removeItem = useCallback(
    (tab: TabType, id: string) => controller.removeItem(tab, id),
    [controller],
  )
  const hideItem = useCallback(
    (tab: TabType, id: string) => controller.setItemHidden(tab, id, true),
    [controller],
  )
  const showItem = useCallback(
    (tab: TabType, id: string) => controller.setItemHidden(tab, id, false),
    [controller],
  )
  const reorderItem = useCallback(
    (tab: TabType, activeId: string, overId: string) =>
      controller.reorderItem(tab, activeId, overId),
    [controller],
  )
  const manualReset = useCallback(
    (tab: TabType) => controller.manualReset(tab, new Date()),
    [controller],
  )
  const restoreDefaultChecklists = useCallback(() => controller.restoreDefaults(), [controller])
  const undoRestoreDefaultChecklists = useCallback(
    (overwrite = false) => controller.undoRestore(overwrite),
    [controller],
  )
  const discardRestoreDefaultChecklists = useCallback(
    () => controller.discardRestore(),
    [controller],
  )
  const importFullData = useCallback(
    (imported: ChecklistData) => {
      controller.replaceData(imported)
    },
    [controller],
  )

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
    restoreDefaultChecklists,
    undoRestoreDefaultChecklists,
    discardRestoreDefaultChecklists,
    hasRestoreBackup: restoreState.hasRestoreBackup,
    hasChangesSinceRestore: restoreState.hasChangesSinceRestore,
    importFullData,
    persistenceStatus: controller.getPersistenceStatus(),
    persistenceError: controller.getPersistenceError(),
    syncPort: controller.syncPort,
  }
}
