import { memo } from 'react'
import { CalendarDays, CalendarRange, CalendarFold } from 'lucide-react'
import type { TabType } from '../types'
import { cn } from '../utils/cn'

interface TabSwitchProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: { key: TabType; label: string; icon: typeof CalendarDays }[] = [
  { key: 'daily', label: '每日清单', icon: CalendarDays },
  { key: 'weekly', label: '每周清单', icon: CalendarRange },
  { key: 'monthly', label: '每月清单', icon: CalendarFold },
]

export const TabSwitch = memo(function TabSwitch({ activeTab, onTabChange }: TabSwitchProps) {
  return (
    <div
      className="glass divide-y divide-border rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:shadow-card-hover"
      role="tablist"
    >
      {tabs.map(({ key, label, icon: Icon }) => (
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
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  )
})
