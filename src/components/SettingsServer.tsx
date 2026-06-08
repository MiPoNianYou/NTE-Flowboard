import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import type { ResetConfig, ServerRegion } from '../types'
import { SERVER_REGIONS } from '../utils/storage'
import { cn } from '../utils/cn'
import { SettingsPage } from './SettingsPage'
import { Button } from './base/Button'
import { Card } from './base/Card'
import { IconBox } from './base/IconBox'

interface SettingsServerProps {
  resetConfig: ResetConfig
  onResetConfigChange: (config: ResetConfig) => void
  onBack?: () => void
  embedded?: boolean
}

export function SettingsServer({ resetConfig, onResetConfigChange, onBack, embedded }: SettingsServerProps) {
  return (
    <SettingsPage title="服务器设置" onBack={onBack} embedded={embedded}>
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          {(
            Object.entries(SERVER_REGIONS) as [
              ServerRegion,
              { label: string; description: string; abbr: string },
            ][]
          ).map(([region, info]) => (
            <Button
              key={region}
              variant="tertiary"
              onClick={() => onResetConfigChange({ serverRegion: region })}
              className={cn(
                'w-full justify-start gap-3 px-3 py-3 text-left',
                resetConfig.serverRegion === region
                  ? 'bg-primary-soft border border-primary/30'
                  : 'bg-surface border border-border hover:bg-elevated',
              )}
            >
              <span className="font-mono text-sm font-medium text-text-muted flex-shrink-0 w-8 text-center">
                {info.abbr}
              </span>
              <div className="flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    resetConfig.serverRegion === region
                      ? 'text-primary'
                      : 'text-text-primary',
                  )}
                >
                  {info.label}
                </p>
                <p className="text-xs text-text-secondary">{info.description}</p>
              </div>
              {resetConfig.serverRegion === region && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <IconBox
                    icon={<Check size={12} className="text-white" />}
                    size="xs"
                    variant="primary"
                    shape="circle"
                  />
                </motion.div>
              )}
            </Button>
          ))}
        </div>

        <Card className="px-4 py-3">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            每日重置 <span className="font-medium text-text-primary">5:00 AM</span>
            <br />
            每周一重置 <span className="font-medium text-text-primary">5:00 AM</span>
            <br />
            <span className="text-text-muted">按服务器时区，含夏令时自动调整</span>
           </p>
        </Card>
      </div>
    </SettingsPage>
  )
}
