import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { TabType } from '../types'
import { TagInput } from './TagInput'
import { Button } from './base/Button'

interface AddItemFormProps {
  tab: TabType
  onAdd: (tab: TabType, text: string, tags: string[]) => void
}

export function AddItemForm({ tab, onAdd }: AddItemFormProps) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onAdd(tab, text.trim(), tags)
      setText('')
      setTags([])
      setOpen(false)
    }
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
    <form onSubmit={handleSubmit} className="space-y-2 lg:space-y-2.5">
      <div className="flex items-center gap-2 lg:gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="输入新任务..."
          className="flex-1 px-3 py-2 lg:px-4 rounded-lg bg-surface border border-border text-sm text-text-primary outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(91,107,255,0.35)] placeholder-text-muted transition-colors duration-150"
        />
        <Button
          type="submit"
          disabled={!text.trim()}
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
      <div className="pl-1">
        <TagInput tags={tags} onChange={setTags} />
      </div>
    </form>
  )
}
