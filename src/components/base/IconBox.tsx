import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

type IconBoxSize = 'xs' | 'sm' | 'md' | 'lg'
type IconBoxVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'iridescent'
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
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  neutral: 'bg-surface border border-border text-text-secondary',
  iridescent: 'iridescent-bg text-[var(--color-text-on-accent)]',
}

const shapeStyles: Record<IconBoxShape, string> = {
  rounded: 'rounded-xl',
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
        'flex items-center justify-center flex-shrink-0 backdrop-blur-sm',
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
