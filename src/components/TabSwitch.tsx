import { memo } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, CalendarRange, ListTodo } from 'lucide-react'
import type { TabType } from '../types'
import { cn } from '../utils/cn'

interface TabSwitchProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  customName?: string
}

const tabs: { key: TabType; label: string; icon: typeof CalendarDays }[] = [
  { key: 'daily', label: '每日清单', icon: CalendarDays },
  { key: 'weekly', label: '每周清单', icon: CalendarRange },
]

export const TabSwitch = memo(function TabSwitch({ activeTab, onTabChange, customName }: TabSwitchProps) {
  return (
    <div className="flex flex-col gap-2" role="tablist">
      {/* 第一行：每日 + 每周 */}
      <div className="flex gap-1 p-1 bg-surface rounded-lg border border-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => onTabChange(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-base font-medium relative z-10 transition-colors duration-150',
              activeTab === key
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {activeTab === key && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-elevated rounded-lg border border-primary"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2.5">
              <Icon className="size-5" />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* 第二行：自定义清单 */}
      <div className="flex gap-1 p-1 bg-surface rounded-lg border border-border">
        <button
          role="tab"
          aria-selected={activeTab === 'custom'}
          onClick={() => onTabChange('custom')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-base font-medium relative z-10 transition-colors duration-150',
            activeTab === 'custom'
              ? 'text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {activeTab === 'custom' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 bg-elevated rounded-lg border border-primary"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2.5">
            <ListTodo className="size-5" />
            {customName || '自定义清单'}
          </span>
        </button>
      </div>
    </div>
  )
})
