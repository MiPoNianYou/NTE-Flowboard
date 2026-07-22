import { motion } from 'motion/react'
import { Globe } from 'lucide-react'
import type { ServerRegion } from '../../types'
import { SERVER_REGIONS } from '../../utils/defaultData'
import { cn } from '../../utils/cn'
import { SPRING } from '../../utils/motion'
import { SettingsPage } from './SettingsPage'
import { Card } from '../base/Card'
import { useSettings } from '../../context/SettingsContext'
import { useDisplayPreferences } from '../../context/DisplayPreferencesContext'
import { useTranslation } from 'react-i18next'

interface SettingsServerProps {
  onBack?: () => void
  isEmbedded?: boolean
}

export function SettingsServer({ onBack, isEmbedded }: SettingsServerProps) {
  const { t } = useTranslation()
  const { settings, updateSettings } = useSettings()
  const { locale, timeFormat } = useDisplayPreferences()
  const resetTime = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2020, 0, 1, 5)))

  return (
    <SettingsPage title={t('settings.nav.server')} onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-4">
        <div className="space-y-2">
          {(
            Object.entries(SERVER_REGIONS) as [
              ServerRegion,
              { label: string; description: string },
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
                <Globe aria-hidden="true" className="size-5 flex-shrink-0 text-text-muted" />
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-primary' : 'text-text-primary',
                    )}
                  >
                    {t(`settings.server.${region}`)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {region === 'asia'
                      ? `UTC+8 (${t('settings.server.fixed')})`
                      : regionInfo.description}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </div>

        <Card className="px-4 py-3">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            {t('settings.server.resetSchedule', { time: resetTime })}
            <br />
            <span className="text-text-muted">{t('settings.server.timezoneNote')}</span>
          </p>
        </Card>
      </div>
    </SettingsPage>
  )
}
