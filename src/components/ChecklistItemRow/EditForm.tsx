import { useState, useCallback, type KeyboardEvent } from 'react'
import { Save, X } from 'lucide-react'
import type { ChecklistItem } from '../../types'
import { UI } from '../../utils/constants'
import { TagInput } from '../TagInput'
import { Button } from '../base/Button'

interface EditFormProps {
  item: ChecklistItem
  onSave: (text: string, tags: string[]) => void
  onCancel: () => void
}

export function EditForm({ item, onSave, onCancel }: EditFormProps) {
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
