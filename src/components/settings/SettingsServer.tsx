import { motion } from 'motion/react'
import type { ServerRegion } from '../../types'
import { SERVER_REGIONS } from '../../utils/seed'
import { cn } from '../../utils/cn'
import { SPRING } from '../../utils/motion'
import { SettingsPage } from './SettingsPage'
import { Card } from '../base/Card'
import { useSettings } from '../../context/SettingsContext'

interface SettingsServerProps {
  onBack?: () => void
  isEmbedded?: boolean
}

export function SettingsServer({ onBack, isEmbedded }: SettingsServerProps) {
  const { settings, updateSettings } = useSettings()

  return (
    <SettingsPage title="服务器设置" onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-4">
        <div className="space-y-2">
          {(
            Object.entries(SERVER_REGIONS) as [
              ServerRegion,
              { label: string; description: string; abbreviation: string },
            ][]
          ).map(([region, regionInfo]) => {
            const isSelected = settings.serverRegion === region

            return (
              <motion.button
                key={region}
                type="button"
                onClick={() => updateSettings({ serverRegion: region })}
                initial={false}
                animate={{
                  scale: isSelected ? 1.04 : 0.97,
                  opacity: isSelected ? 1 : 0.6,
                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.25)' : '0 0 0 0 transparent',
                  zIndex: isSelected ? 1 : 0,
                }}
                transition={SPRING}
                whileTap={{ scale: isSelected ? 1.01 : 0.94 }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 text-left rounded-xl',
                  isSelected
                    ? 'bg-primary-soft border border-primary/30'
                    : 'bg-surface border border-border',
                )}
              >
                <span className="font-mono text-sm font-medium text-text-muted flex-shrink-0 w-8 text-center">
                  {regionInfo.abbreviation}
                </span>
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-primary' : 'text-text-primary',
                    )}
                  >
                    {regionInfo.label}
                  </p>
                  <p className="text-xs text-text-secondary">{regionInfo.description}</p>
                </div>
              </motion.button>
            )
          })}
        </div>

        <Card className="px-4 py-3">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            每日·每周一·每月一日 <span className="font-medium text-text-primary">5:00 AM</span> 重置
            <br />
            <span className="text-text-muted">按服务器时区，含夏令时自动调整</span>
          </p>
        </Card>
      </div>
    </SettingsPage>
  )
}
