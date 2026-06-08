import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

type IconBoxSize = 'xs' | 'sm' | 'md' | 'lg'
type IconBoxVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
type IconBoxShape = 'rounded' | 'circle'

interface IconBoxProps {
  icon: ReactNode
  size?: IconBoxSize
  variant?: IconBoxVariant
  shape?: IconBoxShape
  className?: string
}

const sizeStyles: Record<IconBoxSize, { box: string; icon: string }> = {
  xs: { box: 'size-5', icon: 'size-3' },
  sm: { box: 'size-8', icon: 'size-4' },
  md: { box: 'size-8 sm:size-9', icon: 'size-4' },
  lg: { box: 'size-10', icon: 'size-5' },
}

const variantStyles: Record<IconBoxVariant, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface border border-border text-text-secondary',
}

const shapeStyles: Record<IconBoxShape, string> = {
  rounded: 'rounded-lg',
  circle: 'rounded-full',
}

export function IconBox({
  icon,
  size = 'md',
  variant = 'neutral',
  shape = 'rounded',
  className,
}: IconBoxProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0',
        sizeStyles[size].box,
        variantStyles[variant],
        shapeStyles[shape],
        className,
      )}
    >
      {icon}
    </div>
  )
}
