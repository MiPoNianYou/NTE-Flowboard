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
  isAllDone: boolean
  nextResetLabel: string
}

export const ProgressCard = memo(function ProgressCard({
  activeTab,
  completedCount,
  totalCount,
  isAllDone,
  nextResetLabel,
}: ProgressCardProps) {
  const title =
    activeTab === 'daily' ? '今日进度' : activeTab === 'weekly' ? '本周进度' : '本月进度'

  return (
    <Card variant="glass" className={cn('p-4 md:p-5', isAllDone && 'border-success/30')}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          {/* Mobile: title + badge horizontal */}
          <div className="md:hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-text-primary">{title}</h2>
              {isAllDone && (
                <Badge variant="success" className="animate-pulse">
                  全部完成
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {completedCount} / {totalCount} 项已完成
            </p>
            <p className="text-xs text-text-muted mt-0.5">{nextResetLabel}</p>
          </div>
          {/* Desktop: badge below */}
          <div className="hidden md:block">
            <h2 className="text-sm font-medium text-text-primary">{title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {completedCount} / {totalCount} 项已完成
            </p>
            <p className="text-xs text-text-muted mt-0.5">{nextResetLabel}</p>
            {isAllDone && (
              <Badge variant="success" className="animate-pulse mt-1.5">
                全部完成
              </Badge>
            )}
          </div>
        </div>
        <ProgressRing completed={completedCount} total={totalCount} />
      </div>
    </Card>
  )
})
