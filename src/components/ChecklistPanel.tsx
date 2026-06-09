import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ChecklistItem, TabType } from '../types'
import { ChecklistItemRow } from './ChecklistItemRow'
import { AddItemForm } from './AddItemForm'
import { EmptyState } from './EmptyState'
import { useSortedItems } from '../hooks/useSortedItems'
import { useItemMotion } from '../hooks/useItemMotion'
import { CARD_STYLES } from '../utils/styles'
import { UI } from '../utils/constants'

interface ChecklistPanelProps {
  visibleItems: ChecklistItem[]
  activeTab: TabType
  autoMoveCompleted: boolean
  newItemOrders: Set<number>
  onToggle: (tab: TabType, order: number) => void
  onEdit: (tab: TabType, order: number, text: string, tags: string[]) => void
  onDelete: (tab: TabType, order: number) => void
  onHide: (tab: TabType, order: number) => void
  onReorder: (tab: TabType, activeOrder: number, overOrder: number) => void
  onAddItem: (tab: TabType, text: string, tags: string[]) => void
  confirmDelete: boolean
  customName?: string
}

/**
 * 清单面板组件
 * 包含清单列表和添加表单
 * 当项目数量超过 50 时自动启用虚拟滚动优化
 */
export function ChecklistPanel({
  visibleItems,
  activeTab,
  autoMoveCompleted,
  newItemOrders,
  onToggle,
  onEdit,
  onDelete,
  onHide,
  onReorder,
  onAddItem,
  confirmDelete,
  customName,
}: ChecklistPanelProps) {
  const { sortedItems, sortedItemIds } = useSortedItems(visibleItems, autoMoveCompleted)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { exitingItems, handleDeleteStart, handleHideStart, getItemAnimation } = useItemMotion({
    onDelete,
    onHide,
  })

  const useVirtual = sortedItems.length > UI.VIRTUAL_THRESHOLD

  // 虚拟滚动器
  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(() => UI.ESTIMATED_ITEM_HEIGHT, []),
    overscan: 8,
    enabled: useVirtual,
  })

  // 拖拽：需要移动 8px 才能开始
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: UI.DRAG_DISTANCE } }))

  // 虚拟模式下自定义碰撞检测：基于数学计算而非 DOM 位置
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (!useVirtual) return closestCenter(args)

      const { collisionRect, droppableContainers } = args

      const collisions = droppableContainers
        .map((container) => {
          const idx = sortedItems.findIndex((i) => i.order === Number(container.id))
          if (idx === -1) return null

          // 用估算位置替代实际 DOM 位置
          const estimatedY = idx * UI.ESTIMATED_ITEM_HEIGHT + UI.ESTIMATED_ITEM_HEIGHT / 2
          const dy = Math.abs(collisionRect.top + collisionRect.height / 2 - estimatedY)

          return {
            id: container.id,
            data: {
              value: 1 / (dy + 1), // 越近权重越高
              droppableContainer: container,
            },
          }
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .sort((a, b) => b.data.value - a.data.value)

      return collisions
    },
    [useVirtual, sortedItems],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        onReorder(activeTab, Number(active.id), Number(over.id))
      }
    },
    [onReorder, activeTab],
  )

  // 虚拟列表的高度（限制最大高度，启用滚动）
  const virtualHeight = Math.min(sortedItems.length * UI.ESTIMATED_ITEM_HEIGHT + UI.VIRTUAL_PADDING, UI.VIRTUAL_MAX_HEIGHT)

  const isEmpty = visibleItems.length === 0
  const virtualItems = useVirtual ? virtualizer.getVirtualItems() : []
  const totalSize = useVirtual ? virtualizer.getTotalSize() : 0

  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={CARD_STYLES.panel}
    >
      {isEmpty ? (
        <EmptyState
          title="暂无任务"
          subtitle={
            activeTab === 'daily' ? '点击下方添加今天的任务'
            : activeTab === 'weekly' ? '点击下方添加本周的任务'
            : `点击下方添加${customName || '自定义'}任务`
          }
        />
      ) : useVirtual ? (
        <>
          <div className="mb-3 text-xs text-text-muted">
            {sortedItems.length} 项 · 虚拟列表模式
          </div>
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto rounded-xl"
            style={{ height: virtualHeight }}
          >
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              collisionDetection={collisionDetection}
            >
              <SortableContext items={sortedItemIds} strategy={verticalListSortingStrategy}>
                <div className="relative" style={{ height: totalSize }}>
                  <AnimatePresence>
                    {virtualItems.map((virtualRow) => {
                      const item = sortedItems[virtualRow.index]
                      if (!item) return null
                      const anim = getItemAnimation(item.order, {
                        isNew: newItemOrders.has(item.order),
                        activeTab,
                        mode: 'virtual',
                      })
                      return (
                        <motion.div
                          key={item.order}
                          data-index={virtualRow.index}
                          initial={anim.initial}
                          animate={anim.animate}
                          transition={anim.transition}
                          onAnimationComplete={anim.onAnimationComplete}
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
                            confirmDelete={confirmDelete}
                          />
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </>
      ) : (
        <motion.div layout="size" className="space-y-1 md:space-y-1.5 mb-4 md:mb-6">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedItemIds} strategy={verticalListSortingStrategy}>
              <AnimatePresence>
                {sortedItems.map((item) => {
                  const anim = getItemAnimation(item.order, {
                    isNew: newItemOrders.has(item.order),
                    activeTab,
                    mode: 'normal',
                  })
                  const isExiting = exitingItems.has(item.order)
                  return (
                    <motion.div
                      key={item.order}
                      layout={autoMoveCompleted && !isExiting ? 'position' : false}
                      initial={anim.initial}
                      animate={anim.animate}
                      transition={anim.transition}
                      onAnimationComplete={anim.onAnimationComplete}
                    >
                      <ChecklistItemRow
                        item={item}
                        tab={activeTab}
                        onToggle={onToggle}
                        onEdit={onEdit}
                        onDelete={handleDeleteStart}
                        onHide={handleHideStart}
                        confirmDelete={confirmDelete}
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </SortableContext>
          </DndContext>
        </motion.div>
      )}
      <AddItemForm tab={activeTab} onAdd={onAddItem} />
    </motion.div>
  )
}
