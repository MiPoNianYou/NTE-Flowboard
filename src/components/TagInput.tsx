import { useState } from 'react'
import { X, Plus } from 'lucide-react'

const TAG_COLORS = [
  'bg-tag-blue/10 text-tag-blue dark:bg-tag-blue/15 dark:text-tag-blue-soft',
  'bg-tag-purple/10 text-tag-purple dark:bg-tag-purple/15 dark:text-tag-purple-soft',
  'bg-tag-amber/10 text-tag-amber dark:bg-tag-amber/15 dark:text-tag-amber-soft',
  'bg-tag-red/10 text-tag-red dark:bg-tag-red/15 dark:text-tag-red-soft',
  'bg-tag-green/10 text-tag-green dark:bg-tag-green/15 dark:text-tag-green-soft',
  'bg-tag-teal/10 text-tag-teal dark:bg-tag-teal/15 dark:text-tag-teal-soft',
  'bg-tag-indigo/10 text-tag-indigo dark:bg-tag-indigo/15 dark:text-tag-indigo-soft',
  'bg-tag-pink/10 text-tag-pink dark:bg-tag-pink/15 dark:text-tag-pink-soft',
]

// 模块级缓存，确保相同标签始终获得相同颜色
const tagColorMap = new Map<string, string>()
let cacheIndex = 0

function getTagColor(tag: string) {
  if (tagColorMap.has(tag)) return tagColorMap.get(tag)!
  tagColorMap.set(tag, TAG_COLORS[cacheIndex % TAG_COLORS.length])
  cacheIndex++
  return tagColorMap.get(tag)!
}

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
        <span
          key={tag}
          className={`inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-lg font-medium ${getTagColor(tag)}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="size-[10px] lg:size-[12px]" />
          </button>
        </span>
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

export { getTagColor }
