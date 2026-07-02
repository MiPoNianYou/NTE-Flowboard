import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'warning'
  | 'primary-soft'
  | 'success-soft'
  | 'warning-soft'
  | 'danger-soft'
  | 'info-soft'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  contentClassName?: string
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:brightness-[0.92] text-[var(--color-text-on-accent)] shadow-md hover:shadow-card-hover [border-width:1.5px] border-transparent',
  secondary: '[border-width:1.5px] border-border text-primary hover:bg-surface-hover',
  tertiary:
    '[border-width:1.5px] border-border text-text-primary hover:text-text-primary hover:bg-surface-hover',
  danger:
    'bg-danger text-[var(--color-text-on-accent)] shadow-md hover:shadow-card-hover [border-width:1.5px] border-transparent',
  warning:
    'bg-warning text-[var(--color-text-on-accent)] shadow-md hover:shadow-card-hover [border-width:1.5px] border-transparent',
  'primary-soft':
    'bg-primary/10 text-primary [border-width:1.5px] border-primary/30 hover:bg-primary/20',
  'success-soft':
    'bg-success/10 text-success [border-width:1.5px] border-success/30 hover:bg-success/20',
  'warning-soft':
    'bg-warning/10 text-warning [border-width:1.5px] border-warning/30 hover:bg-warning/20',
  'danger-soft':
    'bg-danger/10 text-danger [border-width:1.5px] border-danger/30 hover:bg-danger/20',
  'info-soft': 'bg-info/10 text-info [border-width:1.5px] border-info/30 hover:bg-info/20',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    isLoading = false,
    className,
    contentClassName,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-[filter,background-color,color,box-shadow,opacity,transform] duration-200 active:opacity-90 active:translate-y-[-1px]',
        variantStyles[variant],
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          isLoading && 'invisible',
          contentClassName,
        )}
        aria-hidden={isLoading}
      >
        {children}
      </span>
      {isLoading && <Loader2 className="size-3.5 animate-spin absolute" />}
    </button>
  )
})
