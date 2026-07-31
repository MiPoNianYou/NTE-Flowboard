import { type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../base/Button'

interface NavBarProps {
  title: string
  onBack?: () => void
  rightContent?: ReactNode
}

export function NavBar({ title, onBack, rightContent }: NavBarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
      {onBack && (
        <Button
          variant="tertiary"
          onClick={onBack}
          className="p-1.5"
          aria-label={t('settings.backToList')}
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}
      <h2 className="flex-1 text-base font-bold text-text-primary">{title}</h2>
      {rightContent}
    </div>
  )
}
