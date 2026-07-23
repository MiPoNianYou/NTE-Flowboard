import { memo } from 'react'
import type { TabType } from '../types'
import { cn } from '../utils/cn'
import { ProgressRing } from './ProgressRing'
import { Card } from './base/Card'
import { Badge } from './base/Badge'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const title = t(`progress.${activeTab}`)

  return (
    <Card variant="surface" className={cn('p-4 md:p-5', isAllDone && 'border-success/30')}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="md:hidden flex flex-col justify-center h-20">
            <h2 className="text-sm font-medium text-text-primary">{title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('progress.completed', { completed: completedCount, total: totalCount })}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{nextResetLabel}</p>
            {isAllDone && (
              <Badge variant="success" className="animate-pulse mt-1.5 self-start">
                {t('progress.allDone')}
              </Badge>
            )}
          </div>
          <div className="hidden md:flex md:flex-col justify-center md:h-20">
            <h2 className="text-sm font-medium text-text-primary">{title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('progress.completed', { completed: completedCount, total: totalCount })}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{nextResetLabel}</p>
            {isAllDone && (
              <Badge variant="success" className="animate-pulse mt-1.5 self-start">
                {t('progress.allDone')}
              </Badge>
            )}
          </div>
        </div>
        <ProgressRing completed={completedCount} total={totalCount} />
      </div>
    </Card>
  )
})
