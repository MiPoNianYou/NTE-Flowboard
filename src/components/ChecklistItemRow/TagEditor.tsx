import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { TAG_PILL_BASE_CLASS } from '../TagPill'
import { FADE_IN, FADE_OUT } from '../../utils/motion'
import { cn } from '../../utils/cn'
import { getTagColors } from '../../utils/tagColors'
import {
  addTagToCollection,
  removeTagFromCollection,
  TAG_COLLECTION_LIMIT,
} from '../../utils/tagCollection'

type TagMode = { kind: 'idle' } | { kind: 'adding-new'; draft: string; width: number }

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  isEditing: boolean
  suppressMountAnimation?: boolean
  addRequest: number
  onAddRequestHandled: () => void
  onEditStateChange?: (isBusy: boolean) => void
}

export function TagEditor({
  tags,
  onChange,
  isEditing,
  suppressMountAnimation: _suppressMountAnimation,
  addRequest,
  onAddRequestHandled,
  onEditStateChange,
}: TagEditorProps) {
  const [mode, setMode] = useState<TagMode>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const skipNextSyncRef = useRef(false)

  useEffect(() => {
    if (!isEditing) {
      setMode({ kind: 'idle' })
      setError(null)
      skipNextSyncRef.current = false
    }
  }, [isEditing])

  useEffect(() => {
    const isBusy = mode.kind !== 'idle'
    onEditStateChange?.(isBusy)
  }, [mode, onEditStateChange])

  const activeDisplayText = useMemo(() => {
    if (mode.kind === 'adding-new') {
      return error && !mode.draft.trim() ? error : mode.draft.trim() || '标签'
    }
    return '标签'
  }, [error, mode])

  const measureDraftWidth = useCallback((draft: string) => {
    if (!measureRef.current) return 24
    measureRef.current.textContent = draft.trim() || '标签'
    return Math.max(Math.ceil(measureRef.current.getBoundingClientRect().width), 24)
  }, [])

  useEffect(() => {
    if (!isEditing) return
    if (addRequest <= 0) return
    if (mode.kind !== 'idle') {
      onAddRequestHandled()
      return
    }
    setError(null)
    setMode({ kind: 'adding-new', draft: '', width: measureDraftWidth('') })
    onAddRequestHandled()
  }, [addRequest, isEditing, measureDraftWidth, mode, onAddRequestHandled])

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(removeTagFromCollection(tags, tagToRemove))
    },
    [onChange, tags],
  )

  const cancel = useCallback(() => {
    setMode({ kind: 'idle' })
    setError(null)
    skipNextSyncRef.current = false
  }, [])

  const commitNew = useCallback(() => {
    if (mode.kind !== 'adding-new') return

    const result = addTagToCollection(tags, mode.draft)
    if (result.kind === 'added') {
      onChange(result.tags)
      cancel()
      return
    }
    if (result.kind === 'empty') {
      cancel()
      return
    }

    setError(result.kind === 'duplicate' ? '标签已存在' : `最多添加${TAG_COLLECTION_LIMIT}个标签`)
    inputRef.current?.focus()
  }, [cancel, mode, onChange, tags])

  const handleInputBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      window.requestAnimationFrame(() => {
        if (document.activeElement === inputRef.current) return
        if (mode.kind === 'adding-new') commitNew()
      })
    },
    [commitNew, mode],
  )

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        if (mode.kind === 'adding-new') commitNew()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        cancel()
      }
    },
    [cancel, commitNew, mode],
  )

  return (
    <>
      <span
        ref={measureRef}
        className={cn(
          TAG_PILL_BASE_CLASS,
          'absolute -left-[9999px] top-0 pointer-events-none whitespace-nowrap',
        )}
        aria-hidden="true"
      >
        {activeDisplayText}
      </span>

      <div className="flex flex-wrap gap-1 lg:gap-1 shrink-0 items-center">
        <AnimatePresence mode="popLayout">
          {tags.map((tag, index) => {
            const colors = getTagColors(tag)

            return (
              <motion.span
                key={`tag-${tag}-${index}`}
                initial={false}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, transition: FADE_OUT }}
                transition={{ ...FADE_IN, width: { duration: 0.18 } }}
                className={cn(TAG_PILL_BASE_CLASS, 'overflow-hidden')}
                style={{ color: colors.text, backgroundColor: colors.backgroundColor }}
              >
                {tag}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    removeTag(tag)
                  }}
                  className="hover:bg-danger/20 hover:text-danger rounded-full p-0.5 transition-colors duration-150"
                >
                  <X className="size-[10px] lg:size-[12px]" />
                </button>
              </motion.span>
            )
          })}

          {mode.kind === 'adding-new' ? (
            <motion.span
              key="new-tag-input"
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: FADE_OUT }}
              transition={FADE_IN}
              className={cn(
                TAG_PILL_BASE_CLASS,
                'overflow-hidden border-border bg-transparent focus-within:border-primary',
              )}
              style={{ width: mode.width }}
            >
              <input
                ref={inputRef}
                type="text"
                value={mode.draft}
                onChange={(event) => {
                  const value = event.target.value
                  setError(null)
                  setMode((prev) =>
                    prev.kind === 'adding-new'
                      ? { ...prev, draft: value, width: measureDraftWidth(value) }
                      : prev,
                  )
                }}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                autoFocus
                spellCheck={false}
                className={cn(
                  'w-full bg-transparent border-0 p-0 text-xs font-medium outline-none whitespace-nowrap',
                  error ? 'text-[#e8525266] placeholder:text-[#e8525266]' : '',
                )}
                placeholder={error && !mode.draft.trim() ? error : undefined}
                aria-label="新增标签"
              />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  )
}
