import { memo } from 'react'
import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { getTagColors } from '../utils/tagColors'
import { SCALE_ENTRY, SCALE_EXIT } from '../utils/motion'

interface TagPillProps {
  tag: string
  onRemove?: () => void
  suppressMountAnimation?: boolean
}

export const TagPill = memo(function TagPill({
  tag,
  onRemove,
  suppressMountAnimation,
}: TagPillProps) {
  const { text, backgroundColor } = getTagColors(tag)
  return (
    <motion.span
      initial={suppressMountAnimation ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: SCALE_EXIT }}
      transition={SCALE_ENTRY}
      className="inline-flex items-center gap-1 text-xs px-1.5 lg:px-2 py-0.5 rounded-full font-medium border border-transparent transition-[border-color] duration-200 hover:border-border-strong backdrop-blur-sm"
      style={{ color: text, backgroundColor }}
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
