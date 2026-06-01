import { useState, useRef, useEffect } from 'react'
import type { ChecklistItem } from '../types'
import { MS } from '../utils/constants'

export function useItemAnimation(currentItems: ChecklistItem[]) {
  // Track newly added items for enter animation (cleared after animation)
  const prevItemCount = useRef<number>(0)
  const prevItemIds = useRef<Set<number>>(new Set())
  const [newItemOrders, setNewItemOrders] = useState<Set<number>>(() => new Set())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const current = currentItems.length
    const currentIds = new Set(currentItems.map((i) => i.order))

    // Only trigger if item count increased (new items added)
    if (current > prevItemCount.current) {
      // Find newly added items by comparing IDs
      const newIds = [...currentIds].filter((id) => !prevItemIds.current.has(id))
      setNewItemOrders((prev) => {
        const next = new Set(prev)
        newIds.forEach((id) => next.add(id))
        return next
      })

      // Clear after animation window
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setNewItemOrders((prev) => {
          const next = new Set(prev)
          newIds.forEach((id) => next.delete(id))
          return next
        })
      }, MS.ANIMATION_WINDOW)
    }

    prevItemCount.current = current
    prevItemIds.current = currentIds

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [currentItems])

  return {
    newItemOrders,
  }
}
