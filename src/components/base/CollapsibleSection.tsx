import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Card } from './Card'
import { GRID_COLLAPSE } from '../../utils/stylePresets'

interface CollapsibleSectionProps {
  icon?: ReactNode
  label: string
  count?: number
  defaultOpen?: boolean
  isOpen?: boolean
  onToggle?: () => void
  variant?: 'surface' | 'elevated'
  className?: string
  headerOpacity?: number
  onAnimationComplete?: () => void
  children: ReactNode
}

export function CollapsibleSection({
  icon,
  label,
  count,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  variant = 'surface',
  className,
  headerOpacity,
  onAnimationComplete,
  children,
}: CollapsibleSectionProps) {
  const [isInternalOpen, setIsInternalOpen] = useState(defaultOpen)
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : isInternalOpen
  const handleToggle = isControlled
    ? (onToggle ?? (() => {}))
    : () => setIsInternalOpen((prev) => !prev)

  return (
    <Card variant={variant} className={cn('overflow-hidden', className)}>
      <motion.button
        type="button"
        onClick={handleToggle}
        initial={false}
        animate={{ opacity: headerOpacity ?? 1 }}
        transition={{ duration: 0.3 }}
        onAnimationComplete={onAnimationComplete}
        className="w-full flex items-center justify-between px-4 py-3 text-text-primary"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
          {icon}
          {label}
          {count !== undefined && <span className="text-text-muted">({count})</span>}
        </span>
        {isOpen ? (
          <ChevronUp className="size-4 text-text-muted" />
        ) : (
          <ChevronDown className="size-4 text-text-muted" />
        )}
      </motion.button>
      <div className={cn(GRID_COLLAPSE, isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div>{children}</div>
        </div>
      </div>
    </Card>
  )
}
