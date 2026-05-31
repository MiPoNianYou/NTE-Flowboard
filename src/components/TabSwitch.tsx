import { memo } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, CalendarRange } from 'lucide-react'
import type { TabType } from '../types'
import { cn } from '../utils/cn'

interface TabSwitchProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export const TabSwitch = memo(function TabSwitch({ activeTab, onTabChange }: TabSwitchProps) {
  return (
    <div className="flex gap-2 md:gap-2.5 relative">
      {/* Daily tab */}
      <button
        onClick={() => onTabChange('daily')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold relative z-10 transition-colors duration-200',
          activeTab === 'daily'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400',
        )}
      >
        {activeTab === 'daily' && (
          <motion.div
            layoutId="tab-indicator"
            className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl shadow-card border border-indigo-100 dark:border-indigo-800/50"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <CalendarDays className="size-[16px] md:size-[17px]" />
          每日清单
        </span>
      </button>

      {/* Weekly tab */}
      <button
        onClick={() => onTabChange('weekly')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold relative z-10 transition-colors duration-200',
          activeTab === 'weekly'
            ? 'text-purple-600 dark:text-purple-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400',
        )}
      >
        {activeTab === 'weekly' && (
          <motion.div
            layoutId="tab-indicator"
            className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl shadow-card border border-purple-100 dark:border-purple-800/50"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <CalendarRange className="size-[16px] md:size-[17px]" />
          每周清单
        </span>
      </button>
    </div>
  )
})
