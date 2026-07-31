import { Settings2, Globe, Cloud, Database, ChevronRight, type LucideIcon } from 'lucide-react'
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
  activeTab: SubPage | null
  onTabChange: (tab: SubPage) => void
  labels?: Partial<Record<SubPage, string>>
  orientation?: 'vertical' | 'horizontal'
  showDisclosure?: boolean
  className?: string
}

export function SettingsNav({
  activeTab,
  onTabChange,
  labels,
  orientation = 'vertical',
  showDisclosure = false,
  className,
}: SettingsNavProps) {
  const { t } = useTranslation()
  const isMobileEntry = showDisclosure

  return (
    <nav
      className={cn(
        isMobileEntry
          ? 'settings-mobile-list flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-surface'
          : orientation === 'vertical'
            ? 'flex flex-col gap-0.5'
            : 'flex flex-col',
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
            aria-current={isActive ? 'page' : undefined}
            data-settings-initial-focus={isMobileEntry && item.id === 'general' ? true : undefined}
            className={cn(
              isMobileEntry
                ? 'settings-mobile-list-row group relative flex min-h-14 flex-1 items-center gap-3 px-3 py-2.5 text-left text-text-primary hover:bg-surface-hover'
                : cn(
                    'group relative flex min-h-16 items-center gap-3 rounded-control px-3 py-3 text-left transition-colors duration-200',
                    isActive
                      ? 'md:bg-primary/5 md:text-primary text-text-secondary hover:text-text-primary hover:bg-surface-hover md:hover:bg-primary/5 md:hover:text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
                  ),
            )}
          >
            <div
              className={cn(
                'size-8 rounded-compact flex items-center justify-center transition-colors duration-200',
                isMobileEntry
                  ? 'bg-elevated text-primary'
                  : isActive
                    ? 'md:bg-primary/15 bg-surface'
                    : 'bg-surface group-hover:bg-elevated',
              )}
            >
              <item.icon
                className={cn('size-4', isActive && !isMobileEntry && 'md:text-primary')}
              />
            </div>
            <div
              className={cn(
                'min-w-0 flex-1',
                !isMobileEntry && 'md:flex md:items-baseline md:gap-2',
              )}
            >
              <span className="block text-[15px] sm:text-sm font-medium leading-snug">
                {t(item.labelKey)}
              </span>
              {labels?.[item.id] && (
                <span
                  className={cn(
                    'block text-xs leading-snug',
                    isMobileEntry
                      ? 'text-text-muted'
                      : isActive
                        ? 'md:ml-auto md:text-right md:text-primary/70 text-text-muted'
                        : 'md:ml-auto md:text-right text-text-muted',
                  )}
                >
                  {labels[item.id]}
                </span>
              )}
            </div>
            {showDisclosure && <ChevronRight className="size-4 flex-shrink-0 text-text-muted" />}
          </button>
        )
      })}
    </nav>
  )
}
