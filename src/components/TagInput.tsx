import { useState, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { TagPill } from './TagPill'
import { Button } from './base/Button'
import { Input } from './base/Input'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  limit?: number
}

export function TagInput({ tags, onChange, limit }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showInput, setShowInput] = useState(false)

  const atLimit = limit !== undefined && tags.length >= limit

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed) && !atLimit) {
      onChange([...tags, trimmed])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
    if (e.key === 'Escape') {
      setInputValue('')
      setShowInput(false)
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
      {showInput ? (
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) addTag(inputValue)
            setShowInput(false)
          }}
          autoFocus
          placeholder="标签名..."
          inputSize="sm"
          disabled={atLimit}
        />
      ) : (
        <Button
          variant="secondary"
          type="button"
          onClick={() => setShowInput(true)}
          disabled={atLimit}
          className="self-start px-1.5 lg:px-2 py-0.5 lg:py-1 text-xs justify-center"
        >
          <Plus className="size-[10px] lg:size-[12px]" />
          标签
          {limit !== undefined && (
            <span className="text-text-muted ml-0.5">
              {tags.length}/{limit}
            </span>
          )}
        </Button>
      )}
    </div>
  )
}
