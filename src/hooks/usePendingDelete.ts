import { useState, useCallback, useRef, useEffect } from 'react'
import { MS } from '../utils/constants'

export function usePendingDelete(shouldConfirmDelete: boolean, onDelete: (id: string) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 卸载时清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (!shouldConfirmDelete) {
        onDelete(id)
      } else if (pendingId === id) {
        onDelete(id)
        setPendingId(null)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      } else {
        setPendingId(id)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setPendingId(null)
          timerRef.current = null
        }, MS.DELETE_CONFIRM)
      }
    },
    [shouldConfirmDelete, pendingId, onDelete],
  )

  const isPending = useCallback(
    (id: string) => shouldConfirmDelete && pendingId === id,
    [shouldConfirmDelete, pendingId],
  )

  return { handleDelete, isPending }
}
