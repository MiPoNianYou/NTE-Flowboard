import { type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import {
  DndContext,
  type DragEndEvent,
  type CollisionDetection,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface SortListProps {
  sortedItemIds: string[]
  sensors: SensorDescriptor<SensorOptions>[]
  onDragEnd: (event: DragEndEvent) => void
  collisionDetection?: CollisionDetection
  children: ReactNode
}

export function SortList({
  sortedItemIds,
  sensors,
  onDragEnd,
  collisionDetection,
  children,
}: SortListProps) {
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd} collisionDetection={collisionDetection}>
      <SortableContext items={sortedItemIds} strategy={verticalListSortingStrategy}>
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </SortableContext>
    </DndContext>
  )
}
