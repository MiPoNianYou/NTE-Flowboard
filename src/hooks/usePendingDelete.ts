import { useState, useCallback, useRef, useEffect } from 'react'
import { MS } from '../utils/constants'

export function usePendingDelete(
  confirmDelete: boolean,
  onDelete: (order: number) => void,
) {
  const [pendingOrder, setPendingOrder] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 卸载时清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleDelete = useCallback(
    (order: number) => {
      if (!confirmDelete) {
        onDelete(order)
      } else if (pendingOrder === order) {
        onDelete(order)
        setPendingOrder(null)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      } else {
        setPendingOrder(order)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setPendingOrder(null)
          timerRef.current = null
        }, MS.DELETE_CONFIRM)
      }
    },
    [confirmDelete, pendingOrder, onDelete],
  )

  const isPending = useCallback(
    (order: number) => confirmDelete && pendingOrder === order,
    [confirmDelete, pendingOrder],
  )

  return { handleDelete, isPending }
}
