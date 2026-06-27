import { useRef, useEffect, useCallback } from 'react'
import type { ChecklistItem, TabType } from '../types'
import { MS } from '../utils/constants'
import { ITEM_ENTRY } from '../utils/motion'

interface UseItemAnimationsOptions {
  visibleItems: ChecklistItem[]
  activeTab: TabType
  onDelete: (tab: TabType, id: string) => void
  onHide: (tab: TabType, id: string) => void
}

interface ItemAnimationValues {
  initial: { opacity: number; height?: number } | false
  animate: { opacity: number; height?: number | string }
  transition: Record<string, unknown>
  onAnimationComplete: () => void
}

interface UseItemAnimationsResult {
  handleDeleteStart: (tab: TabType, id: string) => void
  handleHideStart: (tab: TabType, id: string) => void
  getItemAnimation: (
    id: string,
    options: { targetTab: TabType; mode: 'normal' | 'virtual' },
  ) => ItemAnimationValues
}

export function useItemAnimations({
  visibleItems,
  activeTab,
  onDelete,
  onHide,
}: UseItemAnimationsOptions): UseItemAnimationsResult {
  // --- 新增项追踪 ---
  const prevItemsRef = useRef<ChecklistItem[]>(visibleItems)
  const newOrdersRef = useRef<Set<string>>(new Set())
  const newIdsRef = useRef<string[]>([])
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tab 切换时同步清空新项追踪（在渲染期间，不在 useEffect 中）
  const prevTabRef = useRef<TabType>(activeTab)
  if (prevTabRef.current !== activeTab) {
    newOrdersRef.current.clear()
    newIdsRef.current = []
    prevItemsRef.current = visibleItems
    prevTabRef.current = activeTab
  }

  const prevIds = new Set(prevItemsRef.current.map((item) => item.id))
  const currentIds = new Set(visibleItems.map((item) => item.id))
  const newlyAddedIds = [...currentIds].filter((id) => !prevIds.has(id))

  if (newlyAddedIds.length > 0) {
    newlyAddedIds.forEach((id) => newOrdersRef.current.add(id))
    newIdsRef.current = newlyAddedIds
  }

  useEffect(() => {
    const ids = newIdsRef.current
    if (ids.length === 0) return
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = setTimeout(() => {
      ids.forEach((id) => newOrdersRef.current.delete(id))
    }, MS.ANIMATION_WINDOW)
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    }
  }, [visibleItems])

  useEffect(() => {
    prevItemsRef.current = visibleItems
  })

  const handleDeleteStart = useCallback(
    (tab: TabType, id: string) => {
      onDelete(tab, id)
    },
    [onDelete],
  )

  const handleHideStart = useCallback(
    (tab: TabType, id: string) => {
      onHide(tab, id)
    },
    [onHide],
  )

  // --- 动画计算（新增项入场动画，退出动画由 AnimatePresence 接管） ---
  const getItemAnimation = useCallback(
    (
      id: string,
      { mode }: { targetTab: TabType; mode: 'normal' | 'virtual' },
    ): ItemAnimationValues => {
      const isNew = newOrdersRef.current.has(id)

      const initial = isNew ? { opacity: 0, height: 0 } : false
      const animate = { opacity: 1, height: 'auto' }
      const transition = mode === 'normal' ? { ...ITEM_ENTRY } : ITEM_ENTRY
      const onAnimationComplete = () => {}

      return { initial, animate, transition, onAnimationComplete }
    },
    [],
  )

  return {
    handleDeleteStart,
    handleHideStart,
    getItemAnimation,
  }
}
