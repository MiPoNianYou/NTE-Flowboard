import { memo, type MouseEvent } from 'react'
import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { getTagColors } from '../utils/tagColors'
import { SCALE_ENTRY, SCALE_EXIT } from '../utils/motion'

export const TAG_PILL_BASE_CLASS =
  'inline-flex items-center gap-1 text-xs px-1.5 lg:px-2 py-0.5 rounded-pill font-medium border border-transparent transition-[border-color] duration-200 hover:border-border-strong backdrop-blur-sm'

interface TagPillProps {
  tag: string
  onClick?: (event: MouseEvent<HTMLSpanElement>) => void
  onRemove?: () => void
  suppressMountAnimation?: boolean
}

export const TagPill = memo(function TagPill({
  tag,
  onClick,
  onRemove,
  suppressMountAnimation,
}: TagPillProps) {
  const { t } = useTranslation()
  const { text, backgroundColor } = getTagColors(tag)
  return (
    <motion.span
      initial={suppressMountAnimation ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: SCALE_EXIT }}
      transition={SCALE_ENTRY}
      onClick={
        onClick
          ? (event) => {
              event.stopPropagation()
              onClick(event)
            }
          : undefined
      }
      className={TAG_PILL_BASE_CLASS}
      style={{ color: text, backgroundColor }}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="hover:bg-danger/20 hover:text-danger rounded-pill p-0.5 transition-colors duration-150"
          aria-label={t('tags.remove', { name: tag })}
        >
          <X className="size-[10px] lg:size-[12px]" />
        </button>
      )}
    </motion.span>
  )
})
