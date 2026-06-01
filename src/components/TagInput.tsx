import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TagPill } from './TagPill'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [showInput, setShowInput] = useState(false)

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    <div className="flex flex-wrap items-center gap-1.5 lg:gap-1.5">
      {tags.map((tag) => (
        <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
      ))}
      {showInput ? (
        <input
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
          className="text-2xs px-2 lg:px-3 py-0.5 lg:py-1 rounded-lg lg:rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600/50 outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 w-20 lg:w-24 focus:border-indigo-400 dark:focus:border-indigo-400 transition-colors"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="inline-flex items-center gap-0.5 lg:gap-1 text-2xs px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-lg lg:rounded-xl border border-dashed border-gray-300 dark:border-gray-600/50 text-gray-400 dark:text-gray-500 hover:border-indigo-400 dark:hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          <Plus className="size-[10px] lg:size-[12px]" />
          标签
        </button>
      )}
    </div>
  )
}
