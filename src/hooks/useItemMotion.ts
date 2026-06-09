import { useCallback, useState } from 'react'
import type { TabType } from '../types'

export type ExitDirection = 'delete' | 'hide'

interface UseItemMotionOptions {
  onDelete: (tab: TabType, order: number) => void
  onHide: (tab: TabType, order: number) => void
}

interface ItemAnimationValues {
  initial: { opacity: number; x?: number; y?: number } | false
  animate: { opacity: number; x?: number; y?: number }
  transition: Record<string, unknown>
  onAnimationComplete: () => void
}

interface UseItemMotionResult {
  exitingItems: Map<number, ExitDirection>
  handleDeleteStart: (tab: TabType, order: number) => void
  handleHideStart: (tab: TabType, order: number) => void
  getItemAnimation: (
    order: number,
    options: {
      isNew: boolean
      activeTab: TabType
      mode: 'normal' | 'virtual'
    },
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

export function useItemMotion({ onDelete, onHide }: UseItemMotionOptions): UseItemMotionResult {
  const [exitingItems, setExitingItems] = useState<Map<number, ExitDirection>>(new Map())

  const handleDeleteStart = useCallback((_tab: TabType, order: number) => {
    setExitingItems(prev => new Map(prev).set(order, 'delete'))
  }, [])

  const handleHideStart = useCallback((_tab: TabType, order: number) => {
    setExitingItems(prev => new Map(prev).set(order, 'hide'))
  }, [])

  const handleExitComplete = useCallback(
    (tab: TabType, order: number, direction: ExitDirection) => {
      setTimeout(() => {
        if (direction === 'delete') {
          onDelete(tab, order)
        } else {
          onHide(tab, order)
        }
        setExitingItems(prev => {
          const next = new Map(prev)
          next.delete(order)
          return next
        })
      }, 40)
    },
    [onDelete, onHide],
  )

  const getItemAnimation = useCallback(
    (
      order: number,
      {
        isNew,
        activeTab,
        mode,
      }: {
        isNew: boolean
        activeTab: TabType
        mode: 'normal' | 'virtual'
      },
    ): ItemAnimationValues => {
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
    exitingItems,
    handleDeleteStart,
    handleHideStart,
    getItemAnimation,
  }
}
