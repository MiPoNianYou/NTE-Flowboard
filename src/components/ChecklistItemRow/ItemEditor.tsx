import { useState, useCallback, type KeyboardEvent } from 'react'
import { Save, X } from 'lucide-react'
import type { ChecklistItem } from '../../types'
import { ACTION_HOVER_SUCCESS, ACTION_HOVER_INFO } from '../../utils/stylePresets'
import { TagInput } from '../TagInput'
import { Button } from '../base/Button'
import { useTranslation } from 'react-i18next'

interface ItemEditorProps {
  item: ChecklistItem
  onSave: (text: string, tags: string[]) => void
  onCancel: () => void
}

export function ItemEditor({ item, onSave, onCancel }: ItemEditorProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(item.text)
  const [tags, setTags] = useState<string[]>(item.tags ?? [])

  const handleSave = useCallback(() => {
    if (text.trim()) onSave(text.trim(), tags)
  }, [text, tags, onSave])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') handleSave()
      if (event.key === 'Escape') onCancel()
    },
    [handleSave, onCancel],
  )

  return (
    <div className="px-3 py-3 lg:px-4 lg:py-3 rounded-xl glass border border-primary space-y-2 lg:space-y-2">
      <div className="flex items-center gap-2 lg:gap-2">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder-text-muted"
          placeholder={t('addItem.placeholder')}
        />
        <Button
          variant="tertiary"
          onClick={handleSave}
          className={ACTION_HOVER_SUCCESS}
          aria-label={t('common.save')}
        >
          <Save size={15} className="lg:hidden" />
          <Save size={17} className="hidden lg:block" />
        </Button>
        <Button
          variant="tertiary"
          onClick={onCancel}
          className={ACTION_HOVER_INFO}
          aria-label={t('common.cancel')}
        >
          <X size={15} className="lg:hidden" />
          <X size={17} className="hidden lg:block" />
        </Button>
      </div>
      <TagInput tags={tags} onChange={setTags} />
    </div>
  )
}
