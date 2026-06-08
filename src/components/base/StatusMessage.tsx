import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

type MessageTone = 'danger' | 'success' | 'warning' | 'info'
type DisplayMode = 'inline' | 'banner' | 'callout'

interface StatusMessageProps {
  tone?: MessageTone
  mode?: DisplayMode
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const toneStyles: Record<MessageTone, { inline: string; banner: string; callout: string }> = {
  danger: {
    inline: 'text-xs text-danger',
    banner: 'text-xs text-danger bg-danger-soft px-3 py-2 rounded-lg',
    callout: 'flex gap-3 bg-danger-soft rounded-lg px-4 py-3 border border-danger/30',
  },
  success: {
    inline: 'text-xs text-success',
    banner: 'text-xs text-success bg-success-soft px-3 py-2 rounded-lg',
    callout: 'flex gap-3 bg-success-soft rounded-lg px-4 py-3 border border-success/30',
  },
  warning: {
    inline: 'text-xs text-warning',
    banner: 'text-xs text-warning bg-warning-soft px-3 py-2 rounded-lg',
    callout: 'flex gap-3 bg-warning-soft rounded-lg px-4 py-3 border border-warning/30',
  },
  info: {
    inline: 'text-xs text-text-secondary',
    banner: 'text-xs text-info bg-info-soft px-3 py-2 rounded-lg',
    callout: 'flex gap-3 bg-primary-soft rounded-lg px-4 py-3 border border-primary/30',
  },
}

const toneTextClass: Record<MessageTone, string> = {
  danger: 'text-danger',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-primary',
}

export function StatusMessage({
  tone = 'danger',
  mode = 'inline',
  icon,
  children,
  className,
}: StatusMessageProps) {
  if (mode === 'callout') {
    return (
      <div className={cn(toneStyles[tone][mode], className)}>
        {icon && (
          <div className={cn('flex-shrink-0 self-center', toneTextClass[tone])}>
            {icon}
          </div>
        )}
        <div className="text-[12px] text-text-secondary leading-relaxed">
          {children}
        </div>
      </div>
    )
  }

  return (
    <p className={cn(toneStyles[tone][mode], className)}>
      {children}
    </p>
  )
}
