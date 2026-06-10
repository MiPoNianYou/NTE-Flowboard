import { motion } from 'motion/react'
import { cn } from '../utils/cn'
import type { CustomResetMode } from '../types'

interface CustomSettingsProps {
  customName: string | undefined
  onCustomNameChange: (name: string) => void
  customResetMode?: CustomResetMode
  onCustomResetModeChange: (mode: CustomResetMode) => void
  isLayoutTransitioning: boolean
}

export function CustomSettings({
  customName,
  onCustomNameChange,
  customResetMode,
  onCustomResetModeChange,
  isLayoutTransitioning,
}: CustomSettingsProps) {
  return (
    <div className="p-3 bg-surface rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">清单名称</span>
        <input
          type="text"
          value={customName ?? ''}
          onChange={(e) => onCustomNameChange(e.target.value)}
          placeholder="自定义清单"
          className="h-8 w-40 text-right text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-colors duration-150"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">重置模式</span>
        <div className="flex h-8 w-40 items-center gap-0.5 p-0.5 bg-surface rounded-lg border border-border">
          {(['daily', 'weekly'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onCustomResetModeChange(mode)}
              className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-sm font-medium relative z-10 transition-colors duration-150"
            >
              {(customResetMode ?? 'daily') === mode && (
                <motion.div
                  layoutId={isLayoutTransitioning ? undefined : 'reset-mode-indicator'}
                  className="absolute inset-0 bg-elevated rounded-lg border border-primary"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className={cn(
                'relative z-10',
                customResetMode === mode ? 'text-text-primary' : 'text-text-secondary',
              )}>
                {mode === 'daily' ? '每日' : '每周'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
