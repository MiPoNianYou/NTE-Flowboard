import { useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import type { ServerRegion } from '../../types'
import { SERVER_REGIONS } from '../../utils/storage'
import { cn } from '../../utils/cn'
import { SettingsPage } from './SettingsPage'
import { Card } from '../base/Card'
import { IconBox } from '../base/IconBox'
import { useSettings } from '../../context/SettingsContext'

interface SettingsServerProps {
  onBack?: () => void
  isEmbedded?: boolean
}

export function SettingsServer({ onBack, isEmbedded }: SettingsServerProps) {
  const { settings, updateSettings } = useSettings()
  const [glowingRegion, setGlowingRegion] = useState<ServerRegion | null>(null)
  const prevRegionRef = useRef<ServerRegion>(settings.serverRegion)

  useEffect(() => {
    if (prevRegionRef.current !== settings.serverRegion) {
      setGlowingRegion(settings.serverRegion)
      prevRegionRef.current = settings.serverRegion
      const timer = setTimeout(() => setGlowingRegion(null), 600)
      return () => clearTimeout(timer)
    }
  }, [settings.serverRegion])

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
            const isGlowing = glowingRegion === region

            return (
              <button
                key={region}
                type="button"
                onClick={() => updateSettings({ serverRegion: region })}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 text-left rounded-xl transition-all duration-200 hover:scale-[1.03]',
                  isSelected
                    ? 'bg-primary-soft border border-primary/30 hover:bg-primary/15'
                    : 'bg-surface border border-border hover:bg-elevated',
                  isGlowing && 'animate-pulse-glow',
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
                <div
                  className={cn(
                    'transition-[transform,opacity]',
                    isSelected ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90',
                    isSelected
                      ? 'duration-[480ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]'
                      : 'duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                  )}
                >
                  <IconBox
                    icon={<Check size={12} className="text-[var(--color-text-on-accent)]" />}
                    size="xs"
                    variant="primary"
                    shape="circle"
                    className="!backdrop-blur-none"
                  />
                </div>
              </button>
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
