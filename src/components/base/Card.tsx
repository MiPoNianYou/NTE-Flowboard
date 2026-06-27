import { type HTMLAttributes, type ReactNode, forwardRef } from 'react'
import { cn } from '../../utils/cn'

type CardVariant = 'surface' | 'elevated' | 'glass' | 'glass-strong'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  isComposing?: boolean
  children: ReactNode
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'bg-surface rounded-xl border border-border shadow-card',
  elevated: 'bg-elevated rounded-xl border border-border-strong shadow-elevated backdrop-blur-md',
  glass: 'glass rounded-xl',
  'glass-strong': 'glass-strong rounded-xl',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'surface', isComposing, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        variantStyles[variant],
        'transition-all duration-200 hover:scale-[1.03] hover:shadow-card-hover',
        isComposing && 'scale-[1.03] shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
