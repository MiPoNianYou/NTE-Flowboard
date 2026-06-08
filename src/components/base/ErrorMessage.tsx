import { type ReactNode } from 'react'
import { StatusMessage } from './StatusMessage'

interface ErrorMessageProps {
  variant?: 'inline' | 'banner'
  children: ReactNode
  className?: string
}

export function ErrorMessage({ variant = 'inline', children, className }: ErrorMessageProps) {
  return (
    <StatusMessage
      tone="danger"
      mode={variant}
      className={className}
    >
      {children}
    </StatusMessage>
  )
}
