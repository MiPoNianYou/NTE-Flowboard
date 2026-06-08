import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'warning' | 'primary-soft' | 'success-soft' | 'warning-soft' | 'danger-soft' | 'info-soft'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-hover text-white active-press',
  secondary:
    'bg-surface border border-border-strong text-text-primary hover:bg-elevated active-press',
  tertiary:
    'text-text-muted hover:text-text-primary hover:bg-elevated active-press',
  danger:
    'bg-danger text-white hover:bg-danger/90 active-press',
  warning:
    'bg-warning text-white hover:bg-warning/90 active-press',
  'primary-soft':
    'bg-primary-soft text-primary border border-primary/30 hover:bg-primary/20 active-press',
  'success-soft':
    'bg-success-soft text-success border border-success/30 hover:bg-success/20 active-press',
  'warning-soft':
    'bg-warning-soft text-warning border border-warning/30 hover:bg-warning/20 active-press',
  'danger-soft':
    'bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20 active-press',
  'info-soft':
    'bg-info-soft text-info border border-info/30 hover:bg-info/20 active-press',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary',
  loading = false,
  className,
  disabled,
  children,
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
        variantStyles[variant],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : children}
    </button>
  )
})
