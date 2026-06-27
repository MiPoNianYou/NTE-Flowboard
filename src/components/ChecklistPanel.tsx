import { useRef, useCallback, useMemo, useState, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  closestCenter,
} from '@dnd-kit/core'
import { useVirtualizer } from '@tanstack/react-virtual'
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

const emptySubtitles = [
  '没什么事做的话，要不要听听我的家族兴建大计？',
  '早上好！有新的委托吗？柯林斯家族随时可以出发！',
  '还早还早，再出去转一趟吧',
]

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
  const scrollContainerRef = useRef<HTMLDivElement>(null)
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

  const isVirtualMode = sortedItems.length > UI.VIRTUAL_THRESHOLD

  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(() => UI.ESTIMATED_ITEM_HEIGHT, []),
    overscan: 8,
    enabled: isVirtualMode,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: UI.DRAG_DISTANCE } }),
  )

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (!isVirtualMode) return closestCenter(args)
      const { collisionRect, droppableContainers } = args
      const collisions = droppableContainers
        .map((container) => {
          const foundIndex = sortedItems.findIndex((item) => item.id === String(container.id))
          if (foundIndex === -1) return null
          const estimatedY = foundIndex * UI.ESTIMATED_ITEM_HEIGHT + UI.ESTIMATED_ITEM_HEIGHT / 2
          const deltaY = Math.abs(collisionRect.top + collisionRect.height / 2 - estimatedY)
          return {
            id: container.id,
            data: { value: 1 / (deltaY + 1), droppableContainer: container },
          }
        })
        .filter((collision): collision is NonNullable<typeof collision> => collision !== null)
        .sort(
          (leftCollision, rightCollision) => rightCollision.data.value - leftCollision.data.value,
        )
      return collisions
    },
    [isVirtualMode, sortedItems],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        onReorder(activeTab, String(active.id), String(over.id))
      }
    },
    [onReorder, activeTab],
  )

  const virtualHeight = Math.min(
    sortedItems.length * UI.ESTIMATED_ITEM_HEIGHT + UI.VIRTUAL_PADDING,
    UI.VIRTUAL_MAX_HEIGHT,
  )
  const isEmpty = visibleItems.length === 0
  const virtualItems = isVirtualMode ? virtualizer.getVirtualItems() : []
  const totalSize = isVirtualMode ? virtualizer.getTotalSize() : 0
  const emptySubtitle = useMemo(
    () => emptySubtitles[Math.floor(Math.random() * emptySubtitles.length)],
    [],
  )

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
                <EmptyState title="暂无任务" subtitle={emptySubtitle} action={emptyAction} />
              ) : isVirtualMode ? (
                <>
                  <div className="mb-3 text-xs text-text-muted">
                    {sortedItems.length} 项 · 虚拟列表模式
                  </div>
                  <div
                    ref={scrollContainerRef}
                    className="overflow-y-auto rounded-xl"
                    style={{ height: virtualHeight }}
                  >
                    <SortList
                      sortedItemIds={sortedItemIds}
                      sensors={sensors}
                      onDragEnd={handleDragEnd}
                      collisionDetection={collisionDetection}
                    >
                      <div className="relative" style={{ height: totalSize }}>
                        <AnimatePresence mode="popLayout">
                          {virtualItems.map((virtualRow) => {
                            const item = sortedItems[virtualRow.index]
                            if (!item) return null
                            const animation = getItemAnimation(item.id, {
                              targetTab: activeTab,
                              mode: 'virtual',
                            })
                            return (
                              <motion.div
                                key={item.id}
                                data-index={virtualRow.index}
                                initial={animation.initial}
                                animate={animation.animate}
                                transition={animation.transition}
                                onAnimationComplete={animation.onAnimationComplete}
                                className="absolute top-0 left-0 w-full px-0.5"
                                style={{ transform: `translateY(${virtualRow.start}px)` }}
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
                      </div>
                    </SortList>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <SortList
                    sortedItemIds={sortedItemIds}
                    sensors={sensors}
                    onDragEnd={handleDragEnd}
                  >
                    <AnimatePresence mode="popLayout">
                      {sortedItems.map((item) => {
                        const animation = getItemAnimation(item.id, {
                          targetTab: activeTab,
                          mode: 'normal',
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
