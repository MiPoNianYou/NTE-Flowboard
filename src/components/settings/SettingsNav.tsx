import { Settings2, Globe, Cloud, Database, type LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useTranslation } from 'react-i18next'

export type SubPage = 'general' | 'server' | 'cloud' | 'data'

interface NavItem {
  id: SubPage
  icon: LucideIcon
  labelKey: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'general', icon: Settings2, labelKey: 'settings.nav.general' },
  { id: 'server', icon: Globe, labelKey: 'settings.nav.server' },
  { id: 'cloud', icon: Cloud, labelKey: 'settings.nav.cloud' },
  { id: 'data', icon: Database, labelKey: 'settings.nav.data' },
]

interface SettingsNavProps {
  activeTab: SubPage
  onTabChange: (tab: SubPage) => void
  labels?: Partial<Record<SubPage, string>>
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export function SettingsNav({
  activeTab,
  onTabChange,
  labels,
  orientation = 'vertical',
  className,
}: SettingsNavProps) {
  const { t } = useTranslation()
  return (
    <nav
      className={cn(
        orientation === 'vertical' ? 'flex flex-col gap-0.5' : 'flex flex-col',
        className,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={cn(
              'group relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors duration-200',
              isActive
                ? 'md:bg-primary/5 md:text-primary text-text-secondary hover:text-text-primary hover:bg-surface-hover md:hover:bg-primary/5 md:hover:text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
            )}
          >
            <div
              className={cn(
                'size-8 rounded-lg flex items-center justify-center transition-colors duration-200',
                isActive ? 'md:bg-primary/15 bg-surface' : 'bg-surface group-hover:bg-elevated',
              )}
            >
              <item.icon className={cn('size-4', isActive && 'md:text-primary')} />
            </div>
            <span className="shrink-0 whitespace-nowrap text-sm font-medium">
              {t(item.labelKey)}
            </span>
            {labels?.[item.id] && (
              <span
                className={cn(
                  'ml-auto shrink-0 whitespace-nowrap text-right text-xs',
                  isActive ? 'md:text-primary/70 text-text-muted' : 'text-text-muted',
                )}
              >
                {labels[item.id]}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
