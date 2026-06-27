import { type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface SettingRowProps {
  icon?: LucideIcon
  label: string
  description?: string
  trailing: ReactNode
  className?: string
}

export function SettingRow({
  icon: Icon,
  label,
  description,
  trailing,
  className,
}: SettingRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1', className)}>
      <div className="flex items-center gap-3 flex-1 mr-3">
        {Icon && (
          <div className="size-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
            <Icon className="size-4 text-text-secondary" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-[13px] text-text-primary font-medium">{label}</p>
          {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
        </div>
      </div>
      {trailing}
    </div>
  )
}
