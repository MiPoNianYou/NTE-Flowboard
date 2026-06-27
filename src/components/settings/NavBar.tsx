import { type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../base/Button'

interface NavBarProps {
  title: string
  onBack?: () => void
  rightContent?: ReactNode
}

export function NavBar({ title, onBack, rightContent }: NavBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 glass">
      {onBack && (
        <Button variant="tertiary" onClick={onBack} className="p-1.5">
          <ArrowLeft className="size-5" />
        </Button>
      )}
      <h2 className="flex-1 text-base font-bold text-text-primary">{title}</h2>
      {rightContent}
    </div>
  )
}
