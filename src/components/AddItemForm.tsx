import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { TabType } from '../types'
import { TagInput } from './TagInput'
import { cn } from '../utils/cn'

interface Props {
  tab: TabType
  onAdd: (tab: TabType, text: string, tags: string[]) => void
}

export function AddItemForm({ tab, onAdd }: Props) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
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
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-3.5 rounded-xl lg:rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600/30 text-gray-400 dark:text-gray-500 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors text-sm"
      >
        <Plus size={16} className="lg:hidden" />
        <Plus size={20} className="hidden lg:block" />
        <span>添加自定义项目</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 lg:space-y-2.5">
      <div className="flex items-center gap-2 lg:gap-2.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="输入新任务..."
          className="flex-1 px-3 py-2.5 lg:px-4 rounded-xl bg-white/60 dark:bg-white/5 border border-indigo-200 dark:border-indigo-500/30 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-indigo-400 dark:focus:border-indigo-400 placeholder-gray-400 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className={cn(
            'px-4 py-2.5 lg:px-4.5 rounded-xl text-white text-sm font-medium transition-all active:scale-[0.97]',
            text.trim()
              ? 'bg-indigo-500 hover:bg-indigo-600'
              : 'bg-indigo-300 dark:bg-indigo-700 cursor-not-allowed',
          )}
        >
          添加
        </button>
        <button
          type="button"
          onClick={() => {
            setText('')
            setTags([])
            setOpen(false)
          }}
          className="px-3 py-2.5 lg:px-3.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
        >
          取消
        </button>
      </div>
      <div className="pl-1">
        <TagInput tags={tags} onChange={setTags} />
      </div>
    </form>
  )
}
