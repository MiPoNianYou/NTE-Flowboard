import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface SettingRowProps {
  label: string
  description?: string
  trailing: ReactNode
  className?: string
}

export function SettingRow({ label, description, trailing, className }: SettingRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1', className)}>
      <div className="flex-1 mr-3">
        <p className="text-[13px] text-text-primary">{label}</p>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        )}
      </div>
      {trailing}
    </div>
  )
}
