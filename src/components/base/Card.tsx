import { type HTMLAttributes, type ReactNode, forwardRef } from 'react'
import { cn } from '../../utils/cn'

type CardVariant = 'surface' | 'elevated' | 'glass' | 'glass-strong'
type CardRadius = 'card' | 'panel'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  radius?: CardRadius
  isComposing?: boolean
  disableHoverScale?: boolean
  children: ReactNode
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'bg-surface border border-border shadow-card',
  elevated: 'bg-elevated border border-border-strong shadow-elevated backdrop-blur-md',
  glass: 'glass',
  'glass-strong': 'glass-strong',
}

const radiusStyles: Record<CardRadius, string> = {
  card: 'rounded-card',
  panel: 'rounded-panel',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'surface',
    radius = 'card',
    isComposing,
    disableHoverScale = false,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-hover-scale-card={!disableHoverScale}
      className={cn(
        variantStyles[variant],
        radiusStyles[radius],
        disableHoverScale
          ? 'transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-card-hover'
          : 'transition-all duration-200 hover:scale-[1.03] hover:shadow-card-hover',
        isComposing && 'scale-[1.03] shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
