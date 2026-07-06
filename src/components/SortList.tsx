import { type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import {
  DndContext,
  DragOverlay,
  type DropAnimation,
  type DragStartEvent,
  type DragEndEvent,
  type DragCancelEvent,
  type CollisionDetection,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DROP_ANIMATION_MS } from '../utils/motion'

const DROP_ANIMATION: DropAnimation = {
  duration: DROP_ANIMATION_MS,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
}

interface SortListProps {
  sortedItemIds: string[]
  sensors: SensorDescriptor<SensorOptions>[]
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragCancel?: (event: DragCancelEvent) => void
  collisionDetection?: CollisionDetection
  overlay?: ReactNode
  children: ReactNode
}

export function SortList({
  sortedItemIds,
  sensors,
  onDragStart,
  onDragEnd,
  onDragCancel,
  collisionDetection,
  overlay,
  children,
}: SortListProps) {
  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      collisionDetection={collisionDetection}
    >
      <SortableContext items={sortedItemIds} strategy={verticalListSortingStrategy}>
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </SortableContext>
      <DragOverlay dropAnimation={DROP_ANIMATION}>{overlay}</DragOverlay>
    </DndContext>
  )
}
