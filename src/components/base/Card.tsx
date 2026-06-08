import { type HTMLAttributes, type ReactNode, forwardRef } from 'react'
import { cn } from '../../utils/cn'

type CardVariant = 'surface' | 'elevated'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  children: ReactNode
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'bg-surface rounded-lg border border-border',
  elevated: 'bg-elevated rounded-lg border border-border-strong shadow-md',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({
  variant = 'surface',
  className,
  children,
  ...props
}, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        variantStyles[variant],
        'transition-colors duration-150',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
