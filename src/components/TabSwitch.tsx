import { memo } from 'react'
import { CalendarDays, CalendarRange, CalendarFold } from 'lucide-react'
import type { TabType } from '../types'
import { cn } from '../utils/cn'
import { useTranslation } from 'react-i18next'

interface TabSwitchProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: { key: TabType; icon: typeof CalendarDays }[] = [
  { key: 'daily', icon: CalendarDays },
  { key: 'weekly', icon: CalendarRange },
  { key: 'monthly', icon: CalendarFold },
]

export const TabSwitch = memo(function TabSwitch({ activeTab, onTabChange }: TabSwitchProps) {
  const { t } = useTranslation()
  return (
    <div
      className="bg-surface divide-y divide-border rounded-xl border border-border shadow-card overflow-hidden transition-all duration-200 hover:shadow-card-hover"
      role="tablist"
    >
      {tabs.map(({ key, icon: Icon }) => (
        <button
          key={key}
          role="tab"
          aria-selected={activeTab === key}
          onClick={() => onTabChange(key)}
          className={cn(
            'w-full flex items-center justify-center gap-3 px-4 py-3 relative z-10 transition-colors duration-200',
            activeTab === key
              ? 'bg-primary/5 text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
          )}
        >
          <Icon className="size-5 shrink-0" />
          <span className="text-sm font-medium">{t(`tabs.${key}`)}</span>
        </button>
      ))}
    </div>
  )
})
