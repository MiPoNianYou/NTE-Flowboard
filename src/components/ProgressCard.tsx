import { memo } from 'react'
import { ProgressRing } from './ProgressRing'
import type { TabType } from '../types'
import { cn } from '../utils/cn'

interface ProgressCardProps {
  activeTab: TabType
  completedCount: number
  totalCount: number
  allDone: boolean
  nextResetLabel: string
  layout: 'single' | 'two-column'
}

export const ProgressCard = memo(function ProgressCard({
  activeTab,
  completedCount,
  totalCount,
  allDone,
  nextResetLabel,
  layout,
}: ProgressCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 md:p-6 border transition-colors duration-300',
        allDone
          ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 border-emerald-200/60 dark:border-emerald-700/30'
          : 'bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/30',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          layout === 'two-column' &&
            'md:flex-col md:items-center md:text-center md:justify-center md:gap-0',
        )}
      >
        <div>
          <div
            className={cn(
              'flex items-center gap-2 mb-1 md:mb-1.5',
              layout === 'two-column' && 'md:justify-center',
            )}
          >
            <h2 className="text-sm font-semibold mb-1 md:mb-1.5 text-gray-700 dark:text-gray-300">
              {activeTab === 'daily' ? '今日进度' : '本周进度'}
            </h2>
            {allDone && (
              <span className="text-xs px-2 md:px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                ✨ 全部完成
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {completedCount} / {totalCount} 项已完成
          </p>
          <p className="text-2xs text-gray-400/70 dark:text-gray-600 mt-0.5">{nextResetLabel}</p>
        </div>
        <div className={cn(layout === 'two-column' && 'md:mt-3')}>
          <ProgressRing completed={completedCount} total={totalCount} />
        </div>
      </div>
    </div>
  )
})
