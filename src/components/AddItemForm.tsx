import { useState, useRef, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { TabType } from '../types'
import { Button } from './base/Button'
import { TagPill } from './TagPill'
import { UI } from '../utils/constants'

interface AddItemFormProps {
  tab: TabType
  onAdd: (tab: TabType, text: string, tags: string[]) => void
}

export function AddItemForm({ tab, onAdd }: AddItemFormProps) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [editingTag, setEditingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const mainInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onAdd(tab, text.trim(), tags)
      setText('')
      setTags([])
      setOpen(false)
    }
  }

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
    setEditingTag(false)
  }

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="w-full py-2 lg:py-3 justify-center"
      >
        <Plus size={16} className="lg:hidden" />
        <Plus size={20} className="hidden lg:block" />
        <span>添加自定义项目</span>
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !editingTag) {
          setText('')
          setTags([])
          setOpen(false)
        }
      }}
      className="space-y-2"
    >
      <div className="rounded-lg border border-border overflow-hidden">
        <input
          ref={mainInputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="输入新任务..."
          className="w-full px-3 py-2 bg-transparent text-sm text-text-primary outline-none placeholder-text-muted border-b border-border"
        />
        <div className="flex items-center flex-wrap gap-1.5 px-3 py-2">
          {tags.map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              onRemove={() => setTags(tags.filter((t) => t !== tag))}
            />
          ))}
          {editingTag ? (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(tagInput)
                }
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setTagInput('')
                  setEditingTag(false)
                  mainInputRef.current?.focus()
                }
              }}
              onBlur={() => {
                if (tagInput.trim()) addTag(tagInput)
                else setEditingTag(false)
              }}
              autoFocus
              placeholder="标签名"
              className="w-16 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
            />
          ) : tags.length < UI.TAG_LIMIT ? (
            <button
              type="button"
              onClick={() => setEditingTag(true)}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              + 标签
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!text.trim()}
          className="flex-1"
        >
          添加
        </Button>
        <Button
          type="button"
          variant="tertiary"
          onClick={() => {
            setText('')
            setTags([])
            setOpen(false)
          }}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
