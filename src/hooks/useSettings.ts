import { useAutoMoveCompleted } from './useAutoMoveCompleted'
import { useConfirmDelete } from './useConfirmDelete'
import { useShowCustomTab } from './useShowCustomTab'
import { useLocalStorageBoolean } from './useLocalStorageBoolean'

export function useSettings() {
  const { autoMoveCompleted, onAutoMoveCompletedChange } = useAutoMoveCompleted()
  const { confirmDelete, onConfirmDeleteChange } = useConfirmDelete()
  const { showCustomTab, onShowCustomTabChange } = useShowCustomTab()
  const { value: cloudSyncBehavior, onChange: onCloudSyncBehaviorChange } =
    useLocalStorageBoolean('nte-cloud-sync-behavior')

  return {
    autoMoveCompleted,
    onAutoMoveCompletedChange,
    confirmDelete,
    onConfirmDeleteChange,
    cloudSyncBehavior,
    onCloudSyncBehaviorChange,
    showCustomTab,
    onShowCustomTabChange,
  }
}
