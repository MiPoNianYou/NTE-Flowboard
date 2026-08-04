import { useState, useRef, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { TagPill } from './TagPill'
import { Button } from './base/Button'
import { Input } from './base/Input'
import { useComposition } from '../hooks/useComposition'
import { cn } from '../utils/cn'
import {
  addTagToCollection,
  removeTagFromCollection,
  TAG_COLLECTION_LIMIT,
} from '../utils/tagCollection'
import { useTranslation } from 'react-i18next'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  onCompositionChange?: (isComposing: boolean) => void
  compactFocus?: boolean
}

export function TagInput({ tags, onChange, onCompositionChange, compactFocus }: TagInputProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [isInputVisible, setIsInputVisible] = useState(false)
  const isAtLimit = tags.length >= TAG_COLLECTION_LIMIT
  const { isComposingRef, onCompositionStart, onCompositionEnd } = useComposition()
  const tagsRef = useRef(tags)
  tagsRef.current = tags

  const addTag = (value: string) => {
    const result = addTagToCollection(tagsRef.current, value)
    if (result.kind === 'added') {
      tagsRef.current = result.tags
      onChange(result.tags)
      if (result.tags.length >= TAG_COLLECTION_LIMIT) setIsInputVisible(false)
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(removeTagFromCollection(tags, tagToRemove))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') {
      event.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    }
    if (event.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
    if (event.key === 'Escape') {
      setInputValue('')
      setIsInputVisible(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 lg:gap-1">
          <AnimatePresence mode="popLayout">
            {tags.map((tag) => (
              <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className="h-8 w-24 shrink-0 self-start">
        {isInputVisible ? (
          <Input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              onCompositionStart()
              onCompositionChange?.(true)
            }}
            onCompositionEnd={() => {
              onCompositionEnd()
              onCompositionChange?.(false)
            }}
            onBlur={() => {
              if (isComposingRef.current) return
              if (inputValue.trim()) addTag(inputValue)
              setIsInputVisible(false)
            }}
            autoFocus
            placeholder={t('tags.namePlaceholder')}
            inputSize="sm"
            disabled={isAtLimit}
            className={cn(
              'h-8 w-full px-2 py-0.5 [border-width:1.5px] rounded-control',
              compactFocus &&
                'border-border bg-transparent focus:border-primary focus:ring-1 focus:ring-primary/30 focus:ring-offset-0',
            )}
          />
        ) : (
          <Button
            variant="secondary"
            type="button"
            onClick={() => setIsInputVisible(true)}
            disabled={isAtLimit}
            className="h-full w-full min-h-0 px-2 py-0.5 gap-1 rounded-control border-primary/25 bg-primary/5 text-xs sm:text-xs leading-none justify-center hover:bg-primary/10"
          >
            {isAtLimit ? (
              t('tags.limitReached')
            ) : (
              <>
                <Plus className="size-[10px] lg:size-[12px]" /> {t('tags.label')}
                <span className="text-text-muted ml-0.5">
                  {tags.length}/{TAG_COLLECTION_LIMIT}
                </span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
