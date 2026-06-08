import { memo } from 'react'
import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { getTagColors } from '../utils/tagColors'

interface TagPillProps {
  tag: string
  onRemove?: () => void
}

export const TagPill = memo(function TagPill({ tag, onRemove }: TagPillProps) {
  const { text, bg } = getTagColors(tag)
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15, ease: [0.2, 0.6, 0.2, 1] }}
      className="inline-flex items-center gap-1 text-xs px-1.5 lg:px-2 py-0.5 rounded-full font-medium border border-transparent transition-colors duration-150 hover:border-border-strong"
      style={{ color: text, backgroundColor: bg }}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:bg-danger/20 hover:text-danger rounded-full p-0.5 transition-colors duration-150"
        >
          <X className="size-[10px] lg:size-[12px]" />
        </button>
      )}
    </motion.span>
  )
})
