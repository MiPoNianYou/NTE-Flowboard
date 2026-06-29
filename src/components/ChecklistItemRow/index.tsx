import {
  memo,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { Check, ChevronRight, GripVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import type { ChecklistItem, TabType } from '../../types'
import { cn } from '../../utils/cn'
import { usePendingDelete } from '../../hooks/usePendingDelete'
import { FADE_IN, FADE_OUT, SPRING } from '../../utils/motion'
import { TagPill } from '../TagPill'
import { EditForm } from './EditForm'
import { DesktopActions } from './DesktopActions'
import { MobileActions } from './MobileActions'

interface ChecklistItemRowProps {
  item: ChecklistItem
  tab: TabType
  onToggle: (tab: TabType, id: string) => void
  onEdit: (tab: TabType, id: string, text: string, tags: string[]) => void
  onDelete: (tab: TabType, id: string) => void
  onHide: (tab: TabType, id: string) => void
  shouldConfirmDelete: boolean
  onHeightChange?: (id: string, height: number) => void
  suppressMountAnimation?: boolean
  isDragOverlay?: boolean
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  tab,
  onToggle,
  onEdit,
  onDelete,
  onHide,
  shouldConfirmDelete,
  onHeightChange,
  suppressMountAnimation,
  isDragOverlay,
}: ChecklistItemRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  // 测量行高度并报告给父组件
  const measuredRef = useCallback(
    (element: HTMLDivElement | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      rowRef.current = element

      if (!element || !onHeightChange || isDragOverlay) return

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          onHeightChange(item.id, entry.contentRect.height)
        }
      })
      observer.observe(element)
      observerRef.current = observer
    },
    [onHeightChange, item.id, isDragOverlay],
  )

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    isDragging,
  } = useSortable({ id: item.id, disabled: isDragOverlay })

  const mergedRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!isDragOverlay) {
        setSortableRef(element)
      }
      measuredRef(element)
    },
    [setSortableRef, measuredRef, isDragOverlay],
  )

  const sortableStyle: CSSProperties = isDragOverlay
    ? {
        boxShadow: 'var(--shadow-elevated)',
        cursor: 'grabbing',
      }
    : isDragging
      ? { visibility: 'hidden' }
      : transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 100,
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

  const { handleDelete, isPending } = usePendingDelete(
    shouldConfirmDelete,
    useCallback((id: string) => onDelete(tab, id), [onDelete, tab]),
  )

  const handleToggle = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      onToggle(tab, item.id)
    },
    [onToggle, tab, item.id],
  )

  useEffect(() => {
    if (!isExpanded || !isTouch) return
    const handleClick = (event: PointerEvent) => {
      if (rowRef.current && !rowRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [isExpanded, isTouch])

  const tags = useMemo(() => item.tags ?? [], [item.tags])

  const startEdit = useCallback(() => setIsEditing(true), [])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setIsExpanded(false)
  }, [])

  const handleSave = useCallback(
    (text: string, editTags: string[]) => {
      onEdit(tab, item.id, text, editTags)
      setIsEditing(false)
      setIsExpanded(false)
    },
    [onEdit, tab, item.id],
  )

  const handleDeleteClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      handleDelete(item.id)
    },
    [handleDelete, item.id],
  )

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <motion.div
          key="edit"
          ref={mergedRef}
          style={sortableStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: FADE_OUT }}
          transition={FADE_IN}
        >
          <EditForm item={item} onSave={handleSave} onCancel={cancelEdit} />
        </motion.div>
      ) : (
        <motion.div
          key="display"
          ref={mergedRef}
          style={sortableStyle}
          initial={suppressMountAnimation ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: FADE_OUT }}
          transition={FADE_IN}
        >
          <div
            onClick={isTouch ? () => setIsExpanded((prev) => !prev) : undefined}
            className={cn(
              'group flex items-center gap-3 lg:gap-3 px-3 py-2 lg:px-4 lg:py-3 rounded-xl transition-colors duration-200',
              isTouch && isExpanded
                ? 'glass border border-primary/30'
                : item.isCompleted
                  ? 'border border-solid border-success/30 bg-success/5'
                  : 'border border-transparent hover:glass hover:border-border',
            )}
          >
            <button
              {...attributes}
              {...listeners}
              onClick={(event) => event.stopPropagation()}
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
              aria-label={
                item.isCompleted ? `标记「${item.text}」为未完成` : `标记「${item.text}」为已完成`
              }
              aria-pressed={item.isCompleted}
              className={cn(
                'flex-shrink-0 w-5 h-5 lg:w-[22px] lg:h-[22px] rounded-xl border flex items-center justify-center transition-colors duration-200',
                item.isCompleted
                  ? 'bg-success border-success shadow-md'
                  : 'border-border-strong hover:border-primary',
              )}
              animate={{ scale: item.isCompleted ? 1.05 : 1 }}
              whileTap={{ scale: 0.85 }}
              transition={SPRING}
            >
              <AnimatePresence initial={false}>
                {item.isCompleted && (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={SPRING}
                  >
                    <Check size={12} className="text-[var(--color-text-on-accent)] lg:hidden" />
                    <Check
                      size={13}
                      className="text-[var(--color-text-on-accent)] hidden lg:block"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <span
              className={cn(
                'flex-1 text-sm min-w-0 completion-text',
                item.isCompleted
                  ? 'line-through decoration-dashed decoration-success text-text-muted'
                  : 'text-text-primary',
              )}
            >
              {item.text}
            </span>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 lg:gap-1 shrink-0">
                {tags.map((tag) => (
                  <TagPill key={tag} tag={tag} suppressMountAnimation={suppressMountAnimation} />
                ))}
              </div>
            )}

            <DesktopActions
              onEdit={startEdit}
              onHide={() => onHide(tab, item.id)}
              onDelete={handleDeleteClick}
              isPending={isPending(item.id)}
            />

            <ChevronRight
              size={15}
              className={cn(
                'shrink-0 text-text-muted transition-transform duration-200 lg:hidden',
                isExpanded && 'rotate-90',
              )}
            />
          </div>

          <MobileActions
            onEdit={startEdit}
            onHide={() => onHide(tab, item.id)}
            onDelete={handleDeleteClick}
            isPending={isPending(item.id)}
            isExpanded={isExpanded}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
})
