import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { Check, Pencil, Trash2, X, Save, ChevronRight, GripVertical, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import type { ChecklistItem, TabType } from '../types'
import { cn } from '../utils/cn'
import { TagInput, getTagColor } from './TagInput'

interface Props {
  item: ChecklistItem
  tab: TabType
  onToggle: (tab: TabType, order: number) => void
  onEdit: (tab: TabType, order: number, text: string, tags: string[]) => void
  onDelete: (tab: TabType, order: number) => void
  onHide: (tab: TabType, order: number) => void
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  tab,
  onToggle,
  onEdit,
  onDelete,
  onHide,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const [editTags, setEditTags] = useState<string[]>(item.tags ?? [])
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [localCompleted, setLocalCompleted] = useState(item.completed)
  useEffect(() => {
    if (item.completed !== localCompleted) {
      setLocalCompleted(item.completed)
    }
  }, [item.completed, localCompleted])

  const rowRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    isDragging,
  } = useSortable({ id: item.order })

  // Merge sortable ref with our row ref
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setSortableRef(el)
      rowRef.current = el
    },
    [setSortableRef],
  )

  // Only apply transform, NO transition (avoids conflict with layout FLIP animation)
  const sortableStyle: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 1.02 : 1})`,
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 10 : undefined,
        boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.1)' : 'none',
      }
    : {}

  // Detect touch device: no hover capability = true touch (not mouse+touch laptop)
  const isTouch = useMemo(() => {
    try {
      return (
        window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches
      )
    } catch {
      return navigator.maxTouchPoints > 0
    }
  }, [])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const newVal = !localCompleted
      setLocalCompleted(newVal)
      onToggle(tab, item.order)
    },
    [onToggle, tab, localCompleted, item.order],
  )

  // Collapse when clicking outside the row (mobile only)
  useEffect(() => {
    if (!expanded || !isTouch) return
    const handleClick = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [expanded, isTouch])

  const tags = useMemo(() => item.tags ?? [], [item.tags])

  const startEdit = useCallback(() => {
    setEditText(item.text)
    setEditTags(item.tags ?? [])
    setEditing(true)
  }, [item.text, item.tags])

  const cancelEdit = useCallback(() => {
    setEditText(item.text)
    setEditTags(item.tags ?? [])
    setEditing(false)
    setExpanded(false)
  }, [item.text, item.tags])

  const handleSave = useCallback(() => {
    if (editText.trim()) {
      onEdit(tab, item.order, editText.trim(), editTags)
      setEditing(false)
      setExpanded(false)
    }
  }, [editText, editTags, onEdit, tab, item.order])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave()
      if (e.key === 'Escape') cancelEdit()
    },
    [handleSave, cancelEdit],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (confirmDelete) {
        onDelete(tab, item.order)
      } else {
        setConfirmDelete(true)
        setTimeout(() => setConfirmDelete(false), 3000)
      }
    },
    [confirmDelete, onDelete, tab, item.order],
  )

  if (editing) {
    return (
      <div
        ref={mergedRef}
        style={sortableStyle}
        className="px-3 py-3 lg:px-4 lg:py-3.5 rounded-xl bg-white/60 dark:bg-white/5 border border-indigo-200 dark:border-indigo-500/30 space-y-2 lg:space-y-2.5"
      >
        <div className="flex items-center gap-2 lg:gap-2.5">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400"
            placeholder="输入任务内容..."
          />
          <button
            onClick={handleSave}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors active:scale-[0.97]"
          >
            <Save size={15} className="lg:hidden" />
            <Save size={17} className="hidden lg:block" />
          </button>
          <button
            onClick={cancelEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors active:scale-[0.97]"
          >
            <X size={15} className="lg:hidden" />
            <X size={17} className="hidden lg:block" />
          </button>
        </div>
        <TagInput tags={editTags} onChange={setEditTags} />
      </div>
    )
  }

  return (
    <div ref={mergedRef} style={sortableStyle}>
      {/* Main row */}
      <div
        onClick={isTouch ? () => setExpanded((v) => !v) : undefined}
        className={cn(
          'group flex items-center gap-3 lg:gap-3.5 px-3 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-colors duration-300',
          isTouch && expanded
            ? 'bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-600/20'
            : localCompleted
              ? 'border border-dashed border-emerald-300 dark:border-emerald-600/50 bg-emerald-50/50 dark:bg-emerald-900/10'
              : 'border border-transparent hover:bg-white/50 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-gray-600/20',
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex-shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors touch-none select-none',
            isDragging && 'text-indigo-400 dark:text-indigo-500',
          )}
          aria-label="拖拽排序"
        >
          <GripVertical size={14} className="lg:hidden" />
          <GripVertical size={16} className="hidden lg:block" />
        </button>
        {/* Checkbox */}
        <motion.button
          onClick={handleToggle}
          type="button"
          className={cn(
            'flex-shrink-0 w-5 h-5 lg:w-[22px] lg:h-[22px] rounded-lg border-2 flex items-center justify-center',
            localCompleted
              ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600'
              : 'border-gray-300 dark:border-gray-500 hover:border-indigo-400 dark:hover:border-indigo-400',
          )}
          animate={{ scale: localCompleted ? 1.05 : 1 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <AnimatePresence initial={false}>
            {localCompleted && (
              <motion.div
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Check size={12} className="text-white lg:hidden" strokeWidth={3} />
                <Check size={13} className="text-white hidden lg:block" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Text */}
        <span
          className={cn(
            'flex-1 text-sm min-w-0 transition-all duration-500 ease-in-out',
            localCompleted
              ? 'line-through decoration-dashed decoration-emerald-400 dark:decoration-emerald-500 text-gray-400 dark:text-gray-500'
              : 'text-gray-700 dark:text-gray-200',
          )}
        >
          {item.text}
        </span>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 lg:gap-1 shrink-0">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`inline-block text-2xs px-1.5 py-0.5 rounded-lg font-medium ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Desktop: inline action buttons (hover to show) */}
        <div className="hidden lg:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-[opacity]">
          <button
            onClick={(e) => {
              e.stopPropagation()
              startEdit()
            }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors active:scale-[0.97]"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onHide(tab, item.order)
            }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors active:scale-[0.97]"
          >
            <EyeOff size={15} />
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              'p-1.5 rounded-xl transition-colors active:scale-[0.97]',
              confirmDelete
                ? 'text-white bg-red-500 hover:bg-red-600'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30',
            )}
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Mobile: chevron (click to expand) */}
        <ChevronRight
          size={15}
          className={cn(
            'shrink-0 text-gray-300 dark:text-gray-600 transition-transform duration-300 lg:hidden',
            expanded && 'rotate-90',
          )}
        />
      </div>

      {/* Mobile: expandable action bar */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 lg:hidden',
          expanded ? 'collapse-open' : 'collapse-closed',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex items-center justify-end gap-1 pb-1 pt-1 px-1">
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:bg-indigo-100 dark:active:bg-indigo-900/50 transition-colors active:scale-[0.97]"
            >
              <Pencil size={13} />
              <span>编辑</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onHide(tab, item.order)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 active:bg-amber-100 dark:active:bg-amber-900/50 transition-colors active:scale-[0.97]"
            >
              <EyeOff size={13} />
              <span>隐藏</span>
            </button>
            <button
              onClick={handleDelete}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors active:scale-[0.97]',
                confirmDelete
                  ? 'text-white bg-red-500 hover:bg-red-600'
                  : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50',
              )}
            >
              <Trash2 size={13} />
              <span>{confirmDelete ? '确认' : '删除'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
