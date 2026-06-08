import type { ReactNode } from 'react'
import { SettingsSubPage } from './SettingsSubPage'

interface SettingsPageProps {
  title: string
  onBack?: () => void
  embedded?: boolean
  children: ReactNode
}

export function SettingsPage({ title, onBack, embedded, children }: SettingsPageProps) {
  if (embedded) return <>{children}</>
  return <SettingsSubPage title={title} onBack={onBack!}>{children}</SettingsSubPage>
}
