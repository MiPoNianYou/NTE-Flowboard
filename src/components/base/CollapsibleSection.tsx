import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'
import { Card } from './Card'

interface CollapsibleSectionProps {
  icon?: ReactNode
  label: string
  count?: number
  defaultOpen?: boolean
  variant?: 'surface' | 'elevated'
  children: ReactNode
}

export function CollapsibleSection({
  icon,
  label,
  count,
  defaultOpen = false,
  variant = 'surface',
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card variant={variant} className="overflow-hidden">
      <Button
        variant="tertiary"
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between px-4 py-3 rounded-none"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
          {icon}
          {label}
          {count !== undefined && <span className="text-text-muted">({count})</span>}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-text-muted" />
        ) : (
          <ChevronDown className="size-4 text-text-muted" />
        )}
      </Button>
      <div className={cn(
        'grid transition-[grid-template-rows] duration-150 ease-[cubic-bezier(0.2,0.6,0.2,1)]',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}>
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </Card>
  )
}
