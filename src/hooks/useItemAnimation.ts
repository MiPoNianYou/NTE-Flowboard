import { useRef, useEffect } from 'react'
import type { ChecklistItem } from '../types'
import { MS } from '../utils/constants'

export function useItemAnimation(currentItems: ChecklistItem[]) {
  const prevItemsRef = useRef<ChecklistItem[]>(currentItems)
  const newOrdersRef = useRef<Set<number>>(new Set())
  const newIdsRef = useRef<number[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevIds = new Set(prevItemsRef.current.map((i) => i.order))
  const currentIds = new Set(currentItems.map((i) => i.order))
  const newIds = [...currentIds].filter((id) => !prevIds.has(id))

  if (newIds.length > 0) {
    newIds.forEach((id) => newOrdersRef.current.add(id))
    newIdsRef.current = newIds
  }

  useEffect(() => {
    const ids = newIdsRef.current
    if (ids.length === 0) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      ids.forEach((id) => newOrdersRef.current.delete(id))
    }, MS.ANIMATION_WINDOW)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [currentItems])

  useEffect(() => {
    prevItemsRef.current = currentItems
  })

  return {
    newItemOrders: newOrdersRef.current,
  }
}
