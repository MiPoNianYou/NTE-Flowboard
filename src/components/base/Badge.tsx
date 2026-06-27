import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'iridescent'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary/15 text-primary border border-primary/30',
  success: 'bg-success/15 text-success border border-success/30',
  warning: 'bg-warning/15 text-warning border border-warning/30',
  danger: 'bg-danger/15 text-danger border border-danger/30',
  info: 'bg-info/15 text-info border border-info/30',
  iridescent:
    'iridescent-bg text-[var(--color-text-on-accent)] border border-border chromatic-aberration-box',
}

export function Badge({ variant = 'primary', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
