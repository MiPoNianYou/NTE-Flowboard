import { Settings2, Globe, Cloud, Database, type LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

export type SubPage = 'general' | 'server' | 'cloud' | 'data'

interface NavItem {
  id: SubPage
  icon: LucideIcon
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'general', icon: Settings2, label: '通用' },
  { id: 'server', icon: Globe, label: '服务器设置' },
  { id: 'cloud', icon: Cloud, label: '云同步' },
  { id: 'data', icon: Database, label: '数据管理' },
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
              'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-200',
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
            <span className={cn('flex-1 text-sm', isActive ? 'font-medium' : 'font-medium')}>
              {item.label}
            </span>
            {labels?.[item.id] && (
              <span
                className={cn(
                  'text-xs',
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
