import { useState, useCallback } from 'react'
import { useAutoMoveCompleted } from './useAutoMoveCompleted'
import { useConfirmDelete } from './useConfirmDelete'

export function useSettings() {
  const { autoMoveCompleted, onAutoMoveCompletedChange } = useAutoMoveCompleted()
  const { confirmDelete, onConfirmDeleteChange } = useConfirmDelete()

  const [cloudSyncBehavior, setCloudSyncBehavior] = useState(() => {
    return localStorage.getItem('nte-cloud-sync-behavior') !== 'false'
  })

  const onCloudSyncBehaviorChange = useCallback((value: boolean) => {
    setCloudSyncBehavior(value)
    localStorage.setItem('nte-cloud-sync-behavior', String(value))
  }, [])

  return {
    autoMoveCompleted,
    onAutoMoveCompletedChange,
    confirmDelete,
    onConfirmDeleteChange,
    cloudSyncBehavior,
    onCloudSyncBehaviorChange,
  }
}
