import { useRef, useCallback, useMemo, useState, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { ChecklistItem, TabType } from '../types'
import type { TabDirection } from '../hooks/useTabManagement'
import { ChecklistItemRow } from './ChecklistItemRow'
import { EmptyState } from './EmptyState'
import { SortList } from './SortList'
import { useSortedItems } from '../hooks/useSortedItems'
import { useItemAnimations } from '../hooks/useItemAnimations'
import { useItemHeights } from '../hooks/useItemHeights'
import { useMeasuredHeight } from '../hooks/useMeasuredHeight'
import { CARD_STYLES } from '../utils/stylePresets'
import { cn } from '../utils/cn'
import { UI } from '../utils/constants'
import { SPRING, ENTRY, PAGE } from '../utils/motion'

interface ChecklistPanelProps {
  visibleItems: ChecklistItem[]
  activeTab: TabType
  direction: TabDirection
  isAutoMoveEnabled: boolean
  onToggle: (tab: TabType, id: string) => void
  onEdit: (tab: TabType, id: string, text: string, tags: string[]) => void
  onDelete: (tab: TabType, id: string) => void
  onHide: (tab: TabType, id: string) => void
  onReorder: (tab: TabType, activeId: string, overId: string) => void
  shouldConfirmDelete: boolean
  emptyAction?: React.ReactNode
}

export function ChecklistPanel({
  visibleItems,
  activeTab,
  direction,
  isAutoMoveEnabled,
  onToggle,
  onEdit,
  onDelete,
  onHide,
  onReorder,
  shouldConfirmDelete,
  emptyAction,
}: ChecklistPanelProps) {
  const { sortedItems, sortedItemIds } = useSortedItems(visibleItems, isAutoMoveEnabled)
  const outerRef = useRef<HTMLDivElement>(null)
  const [verticalPadding, setVerticalPadding] = useState(0)
  const { handleDeleteStart, handleHideStart, getItemAnimation } = useItemAnimations({
    visibleItems,
    activeTab,
    onDelete,
    onHide,
  })
  const { reportHeight, getHeight } = useItemHeights(activeTab)
  const [emptyContentRef, emptyContentHeight] = useMeasuredHeight<HTMLDivElement>()
  const [totalHeight, setTotalHeight] = useState<number | null>(null)
  const lastSetHeightRef = useRef<number | null>(null)
  const isFirstSetRef = useRef(true)

  const enterInitial = useMemo(
    () => ({ opacity: 0, y: direction === 'down' ? -16 : 16 }),
    [direction],
  )
  const exitAnimate = useMemo(
    () => ({ opacity: 0, y: direction === 'down' ? 16 : -16, transition: PAGE }),
    [direction],
  )

  useLayoutEffect(() => {
    if (!outerRef.current) return
    const style = window.getComputedStyle(outerRef.current)
    const paddingTop = parseFloat(style.paddingTop)
    const paddingBottom = parseFloat(style.paddingBottom)
    const borderTop = parseFloat(style.borderTopWidth)
    const borderBottom = parseFloat(style.borderBottomWidth)
    setVerticalPadding(paddingTop + paddingBottom + borderTop + borderBottom)
  }, [])

  const itemIds = useMemo(() => sortedItems.map((i) => i.id), [sortedItems])
  const itemSpacing = sortedItems.length > 1 ? (sortedItems.length - 1) * 6 : 0 // space-y-1.5 = 6px

  // 直接计算，不缓存，确保 getHeight 最新返回值被使用
  let measuredHeight: number | null = null
  if (sortedItems.length > 0) {
    const measuredTotal = itemIds.reduce((sum, id) => {
      const h = getHeight(id)
      return sum + (h !== undefined ? h : 0)
    }, 0)
    const measuredCount = itemIds.filter((id) => getHeight(id) !== undefined).length
    if (measuredCount > 0) {
      measuredHeight = measuredTotal + itemSpacing + verticalPadding
    }
  } else if (sortedItems.length === 0 && emptyContentHeight !== null) {
    measuredHeight = emptyContentHeight + verticalPadding
  }

  // 当测量完成时更新 totalHeight（只在值变化时调用，避免 framer-motion 重置动画）
  useLayoutEffect(() => {
    if (
      measuredHeight !== null &&
      verticalPadding > 0 &&
      measuredHeight !== lastSetHeightRef.current
    ) {
      lastSetHeightRef.current = measuredHeight
      setTotalHeight(measuredHeight)
    }
  }, [measuredHeight, verticalPadding])

  // 首次 totalHeight 设置后，标记为非首次（在渲染后执行，确保 transition 正确）
  useEffect(() => {
    if (totalHeight !== null && isFirstSetRef.current) {
      isFirstSetRef.current = false
    }
  }, [totalHeight])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: UI.DRAG_DISTANCE } }),
  )

  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (over && active.id !== over.id) {
        onReorder(activeTab, String(active.id), String(over.id))
      }
    },
    [onReorder, activeTab],
  )

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveId(null)
  }, [])

  const activeItem = activeId ? sortedItems.find((i) => i.id === activeId) : null

  const isEmpty = visibleItems.length === 0

  return (
    <motion.div
      ref={outerRef}
      animate={totalHeight !== null ? { height: totalHeight } : undefined}
      transition={!isFirstSetRef.current ? SPRING : { duration: 0 }}
      className={cn(CARD_STYLES.glass, 'overflow-hidden')}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={enterInitial}
          animate={{ opacity: 1, y: 0, transition: ENTRY }}
          exit={exitAnimate}
        >
          <div className="relative">
            <div ref={sortedItems.length === 0 ? emptyContentRef : undefined}>
              {isEmpty ? (
                <EmptyState title="暂无任务" action={emptyAction} />
              ) : (
                <div className="space-y-1.5">
                  <SortList
                    sortedItemIds={sortedItemIds}
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                    overlay={
                      activeItem ? (
                        <ChecklistItemRow
                          item={activeItem}
                          tab={activeTab}
                          onToggle={onToggle}
                          onEdit={onEdit}
                          onDelete={handleDeleteStart}
                          onHide={handleHideStart}
                          shouldConfirmDelete={shouldConfirmDelete}
                          onHeightChange={reportHeight}
                          suppressMountAnimation
                          isDragOverlay
                        />
                      ) : undefined
                    }
                  >
                    <AnimatePresence mode="popLayout">
                      {sortedItems.map((item) => {
                        const animation = getItemAnimation(item.id, {
                          targetTab: activeTab,
                        })
                        return (
                          <motion.div
                            key={item.id}
                            layout="position"
                            initial={animation.initial}
                            animate={animation.animate}
                            transition={animation.transition}
                            onAnimationComplete={animation.onAnimationComplete}
                          >
                            <ChecklistItemRow
                              item={item}
                              tab={activeTab}
                              onToggle={onToggle}
                              onEdit={onEdit}
                              onDelete={handleDeleteStart}
                              onHide={handleHideStart}
                              shouldConfirmDelete={shouldConfirmDelete}
                              onHeightChange={reportHeight}
                              suppressMountAnimation={isFirstSetRef.current}
                            />
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </SortList>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
