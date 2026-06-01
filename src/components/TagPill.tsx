import { memo } from 'react'
import { X } from 'lucide-react'
import { getTagColor } from '../utils/tagColors'

interface TagPillProps {
  tag: string
  onRemove?: () => void
}

export const TagPill = memo(function TagPill({ tag, onRemove }: TagPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs px-1.5 lg:px-2 py-0.5 rounded-lg font-medium ${getTagColor(tag)}`}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
        >
          <X className="size-[10px] lg:size-[12px]" />
        </button>
      )}
    </span>
  )
})
