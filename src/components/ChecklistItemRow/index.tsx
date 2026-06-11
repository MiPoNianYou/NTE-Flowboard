import { useState, useRef, useEffect, useCallback, useMemo, memo, type CSSProperties, type MouseEvent } from 'react'
import { Check, ChevronRight, GripVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import type { ChecklistItem, TabType } from '../../types'
import { cn } from '../../utils/cn'
import { usePendingDelete } from '../../hooks/usePendingDelete'
import { TagPill } from '../TagPill'
import { EditForm } from './EditForm'
import { DesktopActions } from './DesktopActions'
import { MobileActionBar } from './MobileActionBar'

interface ChecklistItemRowProps {
  item: ChecklistItem
  tab: TabType
  onToggle: (tab: TabType, order: number) => void
  onEdit: (tab: TabType, order: number, text: string, tags: string[]) => void
  onDelete: (tab: TabType, order: number) => void
  onHide: (tab: TabType, order: number) => void
  confirmDelete: boolean
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  tab,
  onToggle,
  onEdit,
  onDelete,
  onHide,
  confirmDelete,
}: ChecklistItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const rowRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    isDragging,
  } = useSortable({ id: item.order })

  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setSortableRef(el)
      rowRef.current = el
    },
    [setSortableRef],
  )

  const sortableStyle: CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 1.02 : 1})`,
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 10 : undefined,
      }
    : {}

  const isTouch = useMemo(() => {
    try {
      return (
        window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches
      )
    } catch {
      return navigator.maxTouchPoints > 0
    }
  }, [])

  const { handleDelete: confirmDeleteAction, isPending } = usePendingDelete(
    confirmDelete,
    useCallback((order: number) => onDelete(tab, order), [onDelete, tab]),
  )

  const handleToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onToggle(tab, item.order)
    },
    [onToggle, tab, item.order],
  )

  useEffect(() => {
    if (!expanded || !isTouch) return
    const handleClick = (e: PointerEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [expanded, isTouch])

  const tags = useMemo(() => item.tags ?? [], [item.tags])

  const startEdit = useCallback(() => setEditing(true), [])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setExpanded(false)
  }, [])

  const handleSave = useCallback(
    (text: string, editTags: string[]) => {
      onEdit(tab, item.order, text, editTags)
      setEditing(false)
      setExpanded(false)
    },
    [onEdit, tab, item.order],
  )

  const handleDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      confirmDeleteAction(item.order)
    },
    [confirmDeleteAction, item.order],
  )

  if (editing) {
    return (
      <div ref={mergedRef} style={sortableStyle}>
        <EditForm item={item} onSave={handleSave} onCancel={cancelEdit} />
      </div>
    )
  }

  return (
    <div ref={mergedRef} style={sortableStyle}>
      <div
        onClick={isTouch ? () => setExpanded((v) => !v) : undefined}
        className={cn(
          'group flex items-center gap-3 lg:gap-3 px-3 py-2 lg:px-4 lg:py-3 rounded-lg transition-colors duration-150',
          isTouch && expanded
            ? 'bg-elevated border border-border-strong'
            : item.completed
              ? 'border border-solid border-success/40 bg-success-soft'
              : 'border border-transparent hover:bg-elevated hover:border-border',
        )}
      >
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex-shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary transition-colors duration-150 touch-none select-none',
            isDragging && 'text-primary',
          )}
          aria-label="拖拽排序"
        >
          <GripVertical size={14} className="lg:hidden" />
          <GripVertical size={16} className="hidden lg:block" />
        </button>

        <motion.button
          onClick={handleToggle}
          type="button"
          aria-label={item.completed ? `标记「${item.text}」为未完成` : `标记「${item.text}」为已完成`}
          aria-pressed={item.completed}
          className={cn(
            'flex-shrink-0 w-5 h-5 lg:w-[22px] lg:h-[22px] rounded-md border flex items-center justify-center',
            item.completed
              ? 'bg-primary border-primary'
              : 'border-border-strong hover:border-primary',
          )}
          animate={{ scale: item.completed ? 1.05 : 1 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <AnimatePresence initial={false}>
            {item.completed && (
              <motion.div
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Check size={12} className="text-white lg:hidden" />
                <Check size={13} className="text-white hidden lg:block" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <span
          className={cn(
            'flex-1 text-sm min-w-0',
            item.completed
              ? 'line-through decoration-dashed decoration-success text-text-muted'
              : 'text-text-primary',
          )}
        >
          {item.text}
        </span>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 lg:gap-1 shrink-0">
            {tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}

        <DesktopActions
          onEdit={startEdit}
          onHide={() => onHide(tab, item.order)}
          onDelete={handleDelete}
          isPending={isPending(item.order)}
        />

        <ChevronRight
          size={15}
          className={cn(
            'shrink-0 text-text-muted transition-transform duration-150 lg:hidden',
            expanded && 'rotate-90',
          )}
        />
      </div>

      <MobileActionBar
        onEdit={startEdit}
        onHide={() => onHide(tab, item.order)}
        onDelete={handleDelete}
        isPending={isPending(item.order)}
        expanded={expanded}
      />
    </div>
  )
})
