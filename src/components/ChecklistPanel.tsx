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
import { CARD_STYLES } from '../utils/styles'

/** 超过此数量启用虚拟滚动 */
const VIRTUAL_THRESHOLD = 50
/** 列表项估算高度（含间距）：52px */
const ESTIMATED_ITEM_HEIGHT = 52

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
}: ChecklistPanelProps) {
  const { sortedItems, sortedItemIds } = useSortedItems(visibleItems, autoMoveCompleted)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const useVirtual = sortedItems.length > VIRTUAL_THRESHOLD

  // 虚拟滚动器
  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(() => ESTIMATED_ITEM_HEIGHT, []),
    overscan: 8,
    enabled: useVirtual,
  })

  // DnD: require 8px movement to start
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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
          const estimatedY = idx * ESTIMATED_ITEM_HEIGHT + ESTIMATED_ITEM_HEIGHT / 2
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
  const virtualHeight = Math.min(sortedItems.length * ESTIMATED_ITEM_HEIGHT + 20, 500)

  if (visibleItems.length === 0) {
    return (
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={CARD_STYLES.panel}
      >
        <EmptyState
          title="暂无任务"
          subtitle={activeTab === 'daily' ? '点击下方添加今天的任务' : '点击下方添加本周的任务'}
        />
        <AddItemForm tab={activeTab} onAdd={onAddItem} />
      </motion.div>
    )
  }

  if (useVirtual) {
    // === 虚拟滚动模式 ===
    const virtualItems = virtualizer.getVirtualItems()
    const totalSize = virtualizer.getTotalSize()

    return (
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={CARD_STYLES.panel}
      >
        <div className="mb-3 text-2xs text-gray-400 dark:text-gray-500">
          {sortedItems.length} 项 · 虚拟列表模式
        </div>
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto scrollbar-thin rounded-xl"
          style={{ height: virtualHeight }}
        >
          <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            collisionDetection={collisionDetection}
          >
            <SortableContext items={sortedItemIds} strategy={verticalListSortingStrategy}>
              <div className="relative" style={{ height: totalSize }}>
                <AnimatePresence initial={false}>
                  {virtualItems.map((virtualRow) => {
                    const item = sortedItems[virtualRow.index]
                    if (!item) return null
                    const isNew = newItemOrders.has(item.order)
                    return (
                      <motion.div
                        key={item.order}
                        data-index={virtualRow.index}
                        initial={isNew ? { opacity: 0, y: -8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          opacity: { duration: 0.1 },
                          scale: { duration: 0.15 },
                          ...(isNew ? { y: { duration: 0.15 } } : {}),
                        }}
                        className="absolute top-0 left-0 w-full px-0.5"
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <ChecklistItemRow
                          item={item}
                          tab={activeTab}
                          onToggle={onToggle}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onHide={onHide}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className="mt-4 md:mt-6">
          <AddItemForm tab={activeTab} onAdd={onAddItem} />
        </div>
      </motion.div>
    )
  }

  // === 常规模式（< 50 项，保留完整动画） ===
  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={CARD_STYLES.panel}
    >
      <div className="space-y-1 md:space-y-1.5 mb-4 md:mb-6">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedItemIds} strategy={verticalListSortingStrategy}>
            <AnimatePresence initial={false}>
              {sortedItems.map((item) => (
                <motion.div
                  key={item.order}
                  layout={autoMoveCompleted ? 'position' : false}
                  layoutDependency={item.completed}
                  initial={newItemOrders.has(item.order) ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: 'tween', ease: 'easeInOut', duration: 0.15 },
                    opacity: { duration: 0.1 },
                    scale: { duration: 0.15 },
                    ...(newItemOrders.has(item.order) ? { y: { duration: 0.15 } } : {}),
                  }}
                >
                  <ChecklistItemRow
                    item={item}
                    tab={activeTab}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onHide={onHide}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      </div>
      <AddItemForm tab={activeTab} onAdd={onAddItem} />
    </motion.div>
  )
}
