import { useState, useRef, useEffect, useCallback, useMemo, memo, type CSSProperties, type MouseEvent, type KeyboardEvent } from 'react'
import { Check, Pencil, Trash2, X, Save, ChevronRight, GripVertical, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import type { ChecklistItem, TabType } from '../types'
import { cn } from '../utils/cn'
import { UI } from '../utils/constants'
import { usePendingDelete } from '../hooks/usePendingDelete'
import { TagInput } from './TagInput'
import { TagPill } from './TagPill'
import { Button } from './base/Button'

interface ChecklistItemRowProps {
  item: ChecklistItem
  tab: TabType
  onToggle: (tab: TabType, order: number) => void
  onEdit: (tab: TabType, order: number, text: string, tags: string[]) => void
  onDelete: (tab: TabType, order: number) => void
  onHide: (tab: TabType, order: number) => void
  confirmDelete: boolean
}

interface EditFormProps {
  item: ChecklistItem
  onSave: (text: string, tags: string[]) => void
  onCancel: () => void
}

function EditForm({ item, onSave, onCancel }: EditFormProps) {
  const [text, setText] = useState(item.text)
  const [tags, setTags] = useState<string[]>(item.tags ?? [])

  const handleSave = useCallback(() => {
    if (text.trim()) onSave(text.trim(), tags)
  }, [text, tags, onSave])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleSave()
      if (e.key === 'Escape') onCancel()
    },
    [handleSave, onCancel],
  )

  return (
    <div className="px-3 py-3 lg:px-4 lg:py-3 rounded-lg bg-surface border border-primary space-y-2 lg:space-y-2">
      <div className="flex items-center gap-2 lg:gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder-text-muted"
          placeholder="输入任务内容..."
        />
        <Button
          variant="tertiary"
          onClick={handleSave}
          className="p-1.5 hover:bg-success-soft hover:text-success"
        >
          <Save size={15} className="lg:hidden" />
          <Save size={17} className="hidden lg:block" />
        </Button>
        <Button
          variant="tertiary"
          onClick={onCancel}
          className="p-1.5 hover:bg-info-soft hover:text-info"
        >
          <X size={15} className="lg:hidden" />
          <X size={17} className="hidden lg:block" />
        </Button>
      </div>
      <TagInput tags={tags} onChange={setTags} limit={UI.TAG_LIMIT} />
    </div>
  )
}

interface DesktopActionsProps {
  onEdit: () => void
  onHide: () => void
  onDelete: (e: MouseEvent) => void
  isPending: boolean
}

function DesktopActions({ onEdit, onHide, onDelete, isPending }: DesktopActionsProps) {
  return (
    <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-[opacity]">
      <Button
        variant="tertiary"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        className="p-1.5 hover:bg-primary-soft hover:text-primary"
      >
        <Pencil size={15} />
      </Button>
      <Button
        variant="tertiary"
        onClick={(e) => { e.stopPropagation(); onHide() }}
        className="p-1.5 hover:bg-warning-soft hover:text-warning"
      >
        <EyeOff size={15} />
      </Button>
      <Button
        variant="tertiary"
        onClick={onDelete}
        className={cn(
          'p-1.5 hover:bg-danger-soft hover:text-danger',
          isPending && 'text-white bg-danger hover:bg-danger hover:text-white',
        )}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  )
}

interface MobileActionBarProps {
  onEdit: () => void
  onHide: () => void
  onDelete: (e: MouseEvent) => void
  isPending: boolean
  expanded: boolean
}

function MobileActionBar({ onEdit, onHide, onDelete, isPending, expanded }: MobileActionBarProps) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-150 lg:hidden',
        expanded ? 'collapse-open' : 'collapse-closed',
      )}
    >
      <div className="overflow-hidden">
        <div className="flex items-center justify-end gap-1 pb-1 pt-1 px-1">
          <Button
            variant="primary-soft"
            onClick={onEdit}
            className="px-2 py-1.5 text-xs justify-center"
          >
            <Pencil size={13} />
            <span>编辑</span>
          </Button>
          <Button
            variant="warning-soft"
            onClick={(e) => { e.stopPropagation(); onHide() }}
            className="px-2 py-1.5 text-xs justify-center"
          >
            <EyeOff size={13} />
            <span>隐藏</span>
          </Button>
          <Button
            variant="danger"
            onClick={onDelete}
            className={cn(
              'px-2 py-1.5 text-xs justify-center',
              !isPending && 'text-text-muted hover:text-danger',
            )}
          >
            <Trash2 size={13} />
            <span>{isPending ? '确认' : '删除'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
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
        {/* 拖拽手柄 */}
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
        {/* 复选框 */}
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

        {/* 文本 */}
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

        {/* 标签 */}
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

        {/* 移动端：箭头 */}
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
