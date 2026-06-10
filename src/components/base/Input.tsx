import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { cn } from '../../utils/cn'

type InputSize = 'md' | 'sm'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
  inputSize?: InputSize
}

const sizeStyles: Record<InputSize, string> = {
  md: 'px-3 py-2 lg:px-4 text-sm',
  sm: 'px-2 lg:px-3 py-0.5 lg:py-1 text-xs w-20 lg:w-24',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, inputSize = 'md', className, ...props }, ref) => {
    return (
      <div className={cn('input-group', inputSize === 'sm' && 'flex items-center gap-2')}>
        {label && inputSize === 'md' && (
          <label className="label">{label}</label>
        )}
        <div className="relative flex-1">
          <input
            ref={ref}
            className={cn(
              'w-full rounded-lg bg-surface border border-border outline-none text-text-primary placeholder-text-muted transition-colors duration-150',
              'focus:border-primary focus:shadow-[0_0_0_3px_var(--focus-ring)]',
              sizeStyles[inputSize],
              icon && 'pr-10',
              error && 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(255,58,92,0.35)]',
              className,
            )}
            {...props}
          />
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
        </div>
        {error && inputSize === 'md' && (
          <p className="text-[11px] text-danger mt-1">{error}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
