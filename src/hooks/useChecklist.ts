import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type {
  BehaviorSettings,
  ChecklistContentSnapshot,
  ChecklistData,
  TabType,
  UiPreferences,
} from '../types'
import { MS } from '../utils/constants'
import { createChecklistController, type ChecklistController } from '../utils/checklistController'
import { createChecklistStorageAdapter, loadData } from '../utils/storage'
import { useVisibilityInterval } from './useVisibilityInterval'
import { generateId } from '../utils/id'
import { toastBus } from '../utils/toastBus'
import { createDefaultChecklistData } from '../utils/defaultData'
import { getEffectiveLocale } from '../i18n/displayPreferences'
import {
  RESTORE_BACKUP_STORAGE_KEY,
  clearRestoreBackup,
  createRestoreBackup,
  hasChecklistContentChanged,
  loadRestoreBackup,
  saveRestoreBackup,
  type ChecklistRestoreBackup,
  type RestoreDefaultsResult,
  type UndoRestoreResult,
} from '../utils/checklistRestoreBackup'
import i18n from '../i18n'

export function useChecklist() {
  const [restoreBackup, setRestoreBackup] = useState<ChecklistRestoreBackup | null>(
    loadRestoreBackup,
  )
  const restoreRetryBackupRef = useRef<ChecklistRestoreBackup | null>(null)
  const controllerRef = useRef<ChecklistController | null>(null)
  if (!controllerRef.current) {
    const initialData = (() => {
      const controller = createChecklistController({
        initialData: loadData(),
        adapter: createChecklistStorageAdapter(),
        onConflict: (count) =>
          toastBus.emit(i18n.t('checklist.conflictSkipped', { count }), 'error'),
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

  useEffect(() => {
    void controller.start()
    const handleBeforeUnload = () => controller.flushNow()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      controller.stop()
    }
  }, [controller])

  useEffect(() => {
    const handleBackupStorage = (event: StorageEvent) => {
      if (event.key === RESTORE_BACKUP_STORAGE_KEY) {
        restoreRetryBackupRef.current = null
        setRestoreBackup(loadRestoreBackup())
      }
    }
    window.addEventListener('storage', handleBackupStorage)
    return () => window.removeEventListener('storage', handleBackupStorage)
  }, [])

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
  const restoreDefaultChecklists = useCallback(async (): Promise<RestoreDefaultsResult> => {
    let backup = restoreRetryBackupRef.current
    if (!backup) {
      const now = new Date()
      const timestamp = now.toISOString()
      const defaults = createDefaultChecklistData(getEffectiveLocale())
      const restored: ChecklistContentSnapshot = {
        daily: defaults.daily,
        weekly: defaults.weekly,
        monthly: defaults.monthly,
        lastDailyReset: timestamp,
        lastWeeklyReset: timestamp,
        lastMonthlyReset: timestamp,
      }
      backup = createRestoreBackup(controller.getSnapshot(), restored, now)
      if (!saveRestoreBackup(backup)) return 'backup-failed'
    }

    setRestoreBackup(backup)
    controller.restoreChecklistContent(backup.restored)
    await controller.flush()
    if (controller.getPersistenceStatus() !== 'saved') {
      restoreRetryBackupRef.current = backup
      return 'persistence-failed'
    }

    restoreRetryBackupRef.current = null
    return 'success'
  }, [controller])
  const undoRestoreDefaultChecklists = useCallback(async (): Promise<UndoRestoreResult> => {
    restoreRetryBackupRef.current = null
    const backup = restoreBackup ?? loadRestoreBackup()
    if (!backup) return 'backup-missing'

    if (!hasChecklistContentChanged(controller.getSnapshot(), backup.before)) {
      if (!clearRestoreBackup()) return 'cleanup-failed'
      setRestoreBackup(null)
      return 'success'
    }

    controller.restoreChecklistContent(backup.before)
    await controller.flush()
    if (controller.getPersistenceStatus() !== 'saved') return 'persistence-failed'
    if (!clearRestoreBackup()) return 'cleanup-failed'

    setRestoreBackup(null)
    return 'success'
  }, [controller, restoreBackup])
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
    hasRestoreBackup: restoreBackup !== null,
    hasChangesSinceRestore: restoreBackup
      ? hasChecklistContentChanged(data, restoreBackup.restored) &&
        hasChecklistContentChanged(data, restoreBackup.before)
      : false,
    importFullData,
    persistenceStatus: controller.getPersistenceStatus(),
    persistenceError: controller.getPersistenceError(),
    syncPort: controller.syncPort,
  }
}
