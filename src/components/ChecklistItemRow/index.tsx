import {
  memo,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { Check, ChevronRight, GripVertical, Save, TagPlus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import type { ChecklistItem, TabType } from '../../types'
import { cn } from '../../utils/cn'
import { usePendingDelete } from '../../hooks/usePendingDelete'
import { useIsMobile } from '../../hooks/useIsMobile'
import { FADE_IN, FADE_OUT, SPRING } from '../../utils/motion'
import { TagPill } from '../TagPill'
import { DesktopActions } from './DesktopActions'
import { MOBILE_ACTION_LAYOUT, MobileActions } from './MobileActions'
import { Button } from '../base/Button'
import {
  ACTION_HOVER_PRIMARY,
  ACTION_HOVER_SUCCESS,
  ACTION_HOVER_INFO,
} from '../../utils/stylePresets'
import { TagEditor } from './TagEditor'
import { TAG_COLLECTION_LIMIT } from '../../utils/tagCollection'
import { useTranslation } from 'react-i18next'

const COMPACT_HEADER_CLASS = 'max-[419px]:min-h-14'

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
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [draftText, setDraftText] = useState(item.text)
  const [draftTags, setDraftTags] = useState<string[]>(item.tags ?? [])
  const [editError, setEditError] = useState<string | null>(null)
  const [tagAddRequest, setTagAddRequest] = useState(0)
  const [isTagEditorBusy, setIsTagEditorBusy] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isCompactLayout = useIsMobile(1024)

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

  useEffect(() => {
    if (!isEditing) {
      setDraftText(item.text)
      setDraftTags(item.tags ?? [])
      setEditError(null)
      setTagAddRequest(0)
      setIsTagEditorBusy(false)
    }
  }, [item.text, item.tags, isEditing])

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
            willChange: 'transform',
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
  const usesMobileActions = isCompactLayout || isTouch

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
    if (!isExpanded || !usesMobileActions) return
    const handleClick = (event: PointerEvent) => {
      if (rowRef.current && !rowRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [isExpanded, usesMobileActions])

  const tags = useMemo(() => item.tags ?? [], [item.tags])

  const beginEdit = useCallback(() => {
    setDraftText(item.text)
    setDraftTags(item.tags ?? [])
    setEditError(null)
    setTagAddRequest(0)
    setIsTagEditorBusy(false)
    setIsEditing(true)
  }, [item.text, item.tags])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setDraftText(item.text)
    setDraftTags(item.tags ?? [])
    setEditError(null)
    setTagAddRequest(0)
    setIsTagEditorBusy(false)
    setIsExpanded(false)
  }, [item.text, item.tags])

  const handleSave = useCallback(
    (nextText: string) => {
      const trimmed = nextText.trim()
      if (!trimmed) {
        setEditError(t('item.nameRequired'))
        inputRef.current?.focus()
        return
      }

      onEdit(tab, item.id, trimmed, draftTags)
      setIsEditing(false)
      setDraftText(trimmed)
      setEditError(null)
      setTagAddRequest(0)
      setIsTagEditorBusy(false)
      setIsExpanded(false)
    },
    [onEdit, tab, item.id, draftTags, t],
  )

  const handleEditKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSave(draftText)
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelEdit()
      }
    },
    [cancelEdit, draftText, handleSave],
  )

  const handleDeleteClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      handleDelete(item.id)
    },
    [handleDelete, item.id],
  )

  return (
    <motion.div
      ref={mergedRef}
      style={sortableStyle}
      initial={suppressMountAnimation ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: FADE_OUT }}
      transition={FADE_IN}
    >
      <div
        className={cn(
          'rounded-xl transition-colors duration-200',
          editError
            ? 'border border-solid border-danger/30 bg-danger/5'
            : isEditing
              ? 'border border-solid border-border bg-surface/40'
              : item.isCompleted
                ? 'border border-solid border-success/30 bg-success/5'
                : 'border border-transparent hover:glass hover:border-border',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isEditing ? (
            <motion.div
              key="edit"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: FADE_OUT }}
              transition={FADE_IN}
            >
              <>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 lg:px-4 lg:py-3',
                    usesMobileActions && COMPACT_HEADER_CLASS,
                  )}
                >
                  <button
                    {...attributes}
                    {...listeners}
                    onClick={(event) => event.stopPropagation()}
                    className={cn(
                      'flex-shrink-0 rounded p-0.5 text-text-muted transition-colors duration-150 touch-none select-none',
                      'cursor-grab active:cursor-grabbing hover:text-text-secondary',
                      isDragging && 'text-primary',
                    )}
                    aria-label={t('item.drag')}
                  >
                    <GripVertical size={14} className="lg:hidden" />
                    <GripVertical size={16} className="hidden lg:block" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-1 min-w-0 items-center rounded-lg px-2 transition-colors duration-200">
                        <input
                          ref={inputRef}
                          type="text"
                          value={draftText}
                          onChange={(event) => {
                            setDraftText(event.target.value)
                            if (editError) setEditError(null)
                          }}
                          onKeyDown={handleEditKeyDown}
                          autoFocus
                          spellCheck={false}
                          className={cn(
                            'w-full min-w-0 bg-transparent border-0 p-0 text-sm text-text-primary outline-none',
                            'placeholder:text-text-muted whitespace-nowrap overflow-x-auto',
                            editError && 'placeholder:text-[#e8525266]',
                          )}
                          placeholder={editError ?? t('addItem.placeholder')}
                          aria-label={t('item.editName')}
                          aria-invalid={!!editError}
                        />
                      </div>

                      <TagEditor
                        tags={draftTags}
                        onChange={setDraftTags}
                        isEditing={isEditing}
                        suppressMountAnimation={suppressMountAnimation}
                        addRequest={tagAddRequest}
                        onAddRequestHandled={() => setTagAddRequest(0)}
                        onEditStateChange={setIsTagEditorBusy}
                      />

                      {!usesMobileActions && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="tertiary"
                            onClick={cancelEdit}
                            className={cn('w-8 h-8 px-0 py-0', ACTION_HOVER_INFO)}
                            aria-label={t('common.cancel')}
                          >
                            <X size={15} />
                          </Button>
                          <Button
                            variant="tertiary"
                            onClick={() => setTagAddRequest((count) => count + 1)}
                            className={cn('w-8 h-8 px-0 py-0', ACTION_HOVER_PRIMARY)}
                            aria-label={t('item.addTag')}
                            disabled={isTagEditorBusy || draftTags.length >= TAG_COLLECTION_LIMIT}
                          >
                            <TagPlus size={15} />
                          </Button>
                          <Button
                            variant="tertiary"
                            onClick={() => handleSave(draftText)}
                            className={cn('w-8 h-8 px-0 py-0', ACTION_HOVER_SUCCESS)}
                            aria-label={t('common.save')}
                          >
                            <Save size={15} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {usesMobileActions && (
                  <div className={MOBILE_ACTION_LAYOUT.bar}>
                    <Button
                      variant="info-soft"
                      onClick={cancelEdit}
                      className={MOBILE_ACTION_LAYOUT.button}
                      contentClassName={MOBILE_ACTION_LAYOUT.content}
                      aria-label={t('common.cancel')}
                      title={t('common.cancel')}
                    >
                      <X size={13} className={MOBILE_ACTION_LAYOUT.icon} />
                      <span className={MOBILE_ACTION_LAYOUT.label}>{t('common.cancel')}</span>
                    </Button>
                    <Button
                      variant="primary-soft"
                      onClick={() => setTagAddRequest((count) => count + 1)}
                      className={MOBILE_ACTION_LAYOUT.button}
                      contentClassName={MOBILE_ACTION_LAYOUT.content}
                      disabled={isTagEditorBusy}
                      aria-label={t('item.addTag')}
                      title={t('item.addTag')}
                    >
                      <TagPlus size={13} className={MOBILE_ACTION_LAYOUT.icon} />
                      <span className={MOBILE_ACTION_LAYOUT.label}>{t('item.addTag')}</span>
                    </Button>
                    <Button
                      variant="success-soft"
                      onClick={() => handleSave(draftText)}
                      className={MOBILE_ACTION_LAYOUT.button}
                      contentClassName={MOBILE_ACTION_LAYOUT.content}
                      aria-label={t('common.save')}
                      title={t('common.save')}
                    >
                      <Save size={13} className={MOBILE_ACTION_LAYOUT.icon} />
                      <span className={MOBILE_ACTION_LAYOUT.label}>{t('common.save')}</span>
                    </Button>
                  </div>
                )}
              </>
            </motion.div>
          ) : (
            <motion.div
              key="display"
              layout
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: FADE_OUT }}
              transition={FADE_IN}
            >
              <div
                onClick={usesMobileActions ? () => setIsExpanded((prev) => !prev) : undefined}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2 lg:px-4 lg:py-3',
                  usesMobileActions && COMPACT_HEADER_CLASS,
                )}
              >
                <button
                  {...attributes}
                  {...listeners}
                  onClick={(event) => event.stopPropagation()}
                  className={cn(
                    'flex-shrink-0 rounded p-0.5 text-text-muted transition-colors duration-150 touch-none select-none',
                    'cursor-grab active:cursor-grabbing hover:text-text-secondary',
                    isDragging && 'text-primary',
                  )}
                  aria-label={t('item.drag')}
                >
                  <GripVertical size={14} className="lg:hidden" />
                  <GripVertical size={16} className="hidden lg:block" />
                </button>

                <motion.button
                  onClick={handleToggle}
                  type="button"
                  initial={suppressMountAnimation && item.isCompleted ? false : undefined}
                  aria-label={
                    item.isCompleted
                      ? t('item.markIncomplete', { name: item.text })
                      : t('item.markComplete', { name: item.text })
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
                  transition={suppressMountAnimation && item.isCompleted ? { duration: 0 } : SPRING}
                >
                  <AnimatePresence initial={false}>
                    {item.isCompleted && (
                      <motion.div
                        key="check"
                        initial={suppressMountAnimation ? false : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={suppressMountAnimation ? { duration: 0 } : SPRING}
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
                      <TagPill
                        key={tag}
                        tag={tag}
                        suppressMountAnimation={suppressMountAnimation}
                      />
                    ))}
                  </div>
                )}

                {!usesMobileActions && (
                  <DesktopActions
                    onEdit={beginEdit}
                    onHide={() => onHide(tab, item.id)}
                    onDelete={handleDeleteClick}
                    isPending={isPending(item.id)}
                  />
                )}

                <ChevronRight
                  size={15}
                  className={cn(
                    'shrink-0 text-text-muted transition-transform duration-200 lg:hidden',
                    isExpanded && 'rotate-90',
                  )}
                />
              </div>

              {usesMobileActions && (
                <MobileActions
                  onEdit={beginEdit}
                  onHide={() => onHide(tab, item.id)}
                  onDelete={handleDeleteClick}
                  isPending={isPending(item.id)}
                  isExpanded={isExpanded}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})
