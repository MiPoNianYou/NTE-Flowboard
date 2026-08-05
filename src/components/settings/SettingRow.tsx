import { type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface SettingRowProps {
  icon?: LucideIcon
  label: string
  description?: string
  descriptionClassName?: string
  iconClassName?: string
  trailing?: ReactNode
  className?: string
}

export function SettingRow({
  icon: Icon,
  label,
  description,
  descriptionClassName,
  iconClassName,
  trailing,
  className,
}: SettingRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1', className)}>
      <div className="flex items-center gap-3 flex-1 mr-3">
        {Icon && (
          <div className="size-8 rounded-control bg-surface flex items-center justify-center flex-shrink-0">
            <Icon className={cn('size-4 text-text-secondary', iconClassName)} />
          </div>
        )}
        <div className="flex-1">
          <p className="text-footnote text-text-primary font-medium">{label}</p>
          {description && (
            <p className={cn('text-xs text-text-secondary mt-0.5', descriptionClassName)}>
              {description}
            </p>
          )}
        </div>
      </div>
      {trailing}
    </div>
  )
}
