import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { cn } from '../../utils/cn'

type InputSize = 'md' | 'sm'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
  suffix?: ReactNode
  inputSize?: InputSize
}

const sizeStyles: Record<InputSize, string> = {
  md: 'px-3 py-2 lg:px-4 text-sm',
  sm: 'px-2 lg:px-3 py-0.5 lg:py-1 text-xs w-20 lg:w-24',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, suffix, inputSize = 'md', className, ...restProps }, ref) => {
    return (
      <div className={cn('input-group', inputSize === 'sm' && 'flex items-center gap-2')}>
        {label && inputSize === 'md' && <label className="label">{label}</label>}
        <div
          className={cn(
            'relative flex items-center flex-1',
            suffix &&
              'rounded-xl border border-border bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary/30',
            suffix &&
              error &&
              'border-danger focus-within:border-danger focus-within:ring-danger/30',
          )}
        >
          <input
            ref={ref}
            className={cn(
              'w-full outline-none text-text-primary placeholder-text-muted transition-[border-color,box-shadow] duration-200',
              sizeStyles[inputSize],
              suffix
                ? 'bg-transparent border-none rounded-none'
                : 'rounded-xl bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-offset-2 focus:ring-primary/30',
              !suffix && icon && 'pr-10',
              !suffix && error && 'border-danger focus:border-danger focus:ring-danger/30',
              className,
            )}
            {...restProps}
          />
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>
          )}
          {suffix && <div className="flex items-center shrink-0 pl-2.5 pr-3 py-2">{suffix}</div>}
        </div>
        {error && inputSize === 'md' && <p className="text-[11px] text-danger mt-1">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
