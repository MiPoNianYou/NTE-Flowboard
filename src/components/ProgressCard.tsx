import { memo } from 'react'
import type { TabType } from '../types'
import { cn } from '../utils/cn'
import { ProgressRing } from './ProgressRing'
import { Card } from './base/Card'
import { Badge } from './base/Badge'

interface ProgressCardProps {
  activeTab: TabType
  completedCount: number
  totalCount: number
  allDone: boolean
  nextResetLabel: string
  layout: 'single' | 'two-column'
  customName?: string
}

export const ProgressCard = memo(function ProgressCard({
  activeTab,
  completedCount,
  totalCount,
  allDone,
  nextResetLabel,
  layout,
  customName,
}: ProgressCardProps) {
  const title =
    activeTab === 'daily' ? '今日进度'
    : activeTab === 'weekly' ? '本周进度'
    : `${customName || '自定义'}进度`

  return (
    <Card
      variant="surface"
      className={cn(
        'p-4 md:p-6',
        allDone && 'border-success/30',
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
          <h2 className="text-sm font-semibold mb-1 md:mb-1 text-text-primary">
            {title}
          </h2>
          <p className="text-xs text-text-secondary">
            {completedCount} / {totalCount} 项已完成
          </p>
          <p className="text-xs text-text-muted mt-0.5">{nextResetLabel}</p>
        </div>
        <div className={cn(
          'flex flex-col items-center gap-2',
          layout === 'two-column' && 'md:mt-3',
        )}>
          <ProgressRing completed={completedCount} total={totalCount} />
          {allDone && (
            <Badge variant="success" className="animate-pulse">
              ✨ 全部完成
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
})
