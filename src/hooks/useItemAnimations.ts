import { useRef, useEffect, useCallback, useState } from 'react'
import type { ChecklistItem, TabType } from '../types'
import { MS } from '../utils/constants'

export type ExitDirection = 'delete' | 'hide'

interface UseItemAnimationsOptions {
  visibleItems: ChecklistItem[]
  onDelete: (tab: TabType, order: number) => void
  onHide: (tab: TabType, order: number) => void
}

interface ItemAnimationValues {
  initial: { opacity: number; x?: number; y?: number } | false
  animate: { opacity: number; x?: number; y?: number }
  transition: Record<string, unknown>
  onAnimationComplete: () => void
}

interface UseItemAnimationsResult {
  handleDeleteStart: (tab: TabType, order: number) => void
  handleHideStart: (tab: TabType, order: number) => void
  getItemAnimation: (
    order: number,
    options: { activeTab: TabType; mode: 'normal' | 'virtual' },
  ) => ItemAnimationValues
}

// 共享 transition 配置
const TRANSITIONS = {
  normal: {
    layout: { type: 'spring' as const, stiffness: 300, damping: 30 },
    opacity: { duration: 0.15 },
    x: { duration: 0.2 },
  },
  virtual: {
    opacity: { duration: 0.1 },
    x: { duration: 0.2 },
  },
} as const

const EXIT_X = 40

export function useItemAnimations({
  visibleItems,
  onDelete,
  onHide,
}: UseItemAnimationsOptions): UseItemAnimationsResult {
  // --- 新增项追踪 ---
  const prevItemsRef = useRef<ChecklistItem[]>(visibleItems)
  const newOrdersRef = useRef<Set<number>>(new Set())
  const newIdsRef = useRef<number[]>([])
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevIds = new Set(prevItemsRef.current.map((i) => i.order))
  const currentIds = new Set(visibleItems.map((i) => i.order))
  const newIds = [...currentIds].filter((id) => !prevIds.has(id))

  if (newIds.length > 0) {
    newIds.forEach((id) => newOrdersRef.current.add(id))
    newIdsRef.current = newIds
  }

  useEffect(() => {
    const ids = newIdsRef.current
    if (ids.length === 0) return
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    animTimeoutRef.current = setTimeout(() => {
      ids.forEach((id) => newOrdersRef.current.delete(id))
    }, MS.ANIMATION_WINDOW)
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    }
  }, [visibleItems])

  useEffect(() => {
    prevItemsRef.current = visibleItems
  })

  // --- 退出动画追踪 ---
  const [exitingItems, setExitingItems] = useState<Map<number, ExitDirection>>(new Map())

  const handleDeleteStart = useCallback((_tab: TabType, order: number) => {
    setExitingItems((prev) => new Map(prev).set(order, 'delete'))
  }, [])

  const handleHideStart = useCallback((_tab: TabType, order: number) => {
    setExitingItems((prev) => new Map(prev).set(order, 'hide'))
  }, [])

  const handleExitComplete = useCallback(
    (tab: TabType, order: number, direction: ExitDirection) => {
      setTimeout(() => {
        if (direction === 'delete') {
          onDelete(tab, order)
        } else {
          onHide(tab, order)
        }
        setExitingItems((prev) => {
          const next = new Map(prev)
          next.delete(order)
          return next
        })
      }, 40)
    },
    [onDelete, onHide],
  )

  // --- 动画计算（合并入口 + 退出） ---
  const getItemAnimation = useCallback(
    (
      order: number,
      { activeTab, mode }: { activeTab: TabType; mode: 'normal' | 'virtual' },
    ): ItemAnimationValues => {
      const isNew = newOrdersRef.current.has(order)
      const exitDirection = exitingItems.get(order)
      const isExiting = !!exitDirection

      const initial =
        mode === 'normal'
          ? isNew
            ? { opacity: 0, x: -20 }
            : false
          : isNew
            ? { opacity: 0, y: -8 }
            : false

      const animate = isExiting
        ? { opacity: 0, x: exitDirection === 'hide' ? -EXIT_X : EXIT_X }
        : mode === 'normal'
          ? { opacity: 1, x: 0 }
          : { opacity: 1, y: 0, x: 0 }

      const transition =
        mode === 'normal'
          ? TRANSITIONS.normal
          : {
              ...TRANSITIONS.virtual,
              ...(isNew ? { y: { duration: 0.15 } } : {}),
            }

      const onAnimationComplete = () => {
        if (isExiting) {
          handleExitComplete(activeTab, order, exitDirection)
        }
      }

      return { initial, animate, transition, onAnimationComplete }
    },
    [exitingItems, handleExitComplete],
  )

  return {
    handleDeleteStart,
    handleHideStart,
    getItemAnimation,
  }
}
