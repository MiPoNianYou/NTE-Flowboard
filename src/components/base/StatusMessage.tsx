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
    banner: 'text-xs text-danger bg-danger/10 px-3 py-2 rounded-xl border border-danger/20',
    callout: 'flex gap-3 bg-danger/10 rounded-xl px-4 py-3 border border-danger/20',
  },
  success: {
    inline: 'text-xs text-success',
    banner: 'text-xs text-success bg-success/10 px-3 py-2 rounded-xl border border-success/20',
    callout: 'flex gap-3 bg-success/10 rounded-xl px-4 py-3 border border-success/20',
  },
  warning: {
    inline: 'text-xs text-warning',
    banner: 'text-xs text-warning bg-warning/10 px-3 py-2 rounded-xl border border-warning/20',
    callout: 'flex gap-3 bg-warning/10 rounded-xl px-4 py-3 border border-warning/20',
  },
  info: {
    inline: 'text-xs text-info',
    banner: 'text-xs text-info bg-info/10 px-3 py-2 rounded-xl border border-info/20',
    callout: 'flex gap-3 bg-info/10 rounded-xl px-4 py-3 border border-info/20',
  },
}

const toneTextClass: Record<MessageTone, string> = {
  danger: 'text-danger',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
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
        {icon && <div className={cn('flex-shrink-0 self-center', toneTextClass[tone])}>{icon}</div>}
        <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
          {children}
        </div>
      </div>
    )
  }

  return <p className={cn(toneStyles[tone][mode], className)}>{children}</p>
}
