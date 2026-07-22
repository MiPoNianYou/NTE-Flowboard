import { ListEnd, CheckCheck, Languages, Clock3 } from 'lucide-react'
import { SettingsPage } from './SettingsPage'
import { ToggleSwitch } from '../base/ToggleSwitch'
import { SettingRow } from './SettingRow'
import { Card } from '../base/Card'
import type { SettingsPageBaseProps } from './SettingsPage'
import { useSettings } from '../../context/SettingsContext'
import { useDisplayPreferences } from '../../context/DisplayPreferencesContext'
import type { LanguagePreference, TimeFormat } from '../../i18n/displayPreferences'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

const LANGUAGE_OPTIONS: {
  value: LanguagePreference
  labelKey: 'languageZh' | 'languageSystem' | 'languageEn'
}[] = [
  { value: 'zh-CN', labelKey: 'languageZh' },
  { value: 'system', labelKey: 'languageSystem' },
  { value: 'en-US', labelKey: 'languageEn' },
]

export function SettingsGeneral({ onBack, isEmbedded }: SettingsPageBaseProps) {
  const { t } = useTranslation()
  const { settings, updateSettings } = useSettings()
  const { language, timeFormat, setLanguage, setTimeFormat } = useDisplayPreferences()

  return (
    <SettingsPage title={t('settings.nav.general')} onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-2">
        <Card variant="surface" className="p-0 overflow-hidden">
          <SettingRow
            icon={Languages}
            label={t('settings.general.language')}
            trailing={
              <div
                role="group"
                aria-label={t('settings.general.language')}
                className="grid grid-cols-3 rounded-lg border border-border bg-elevated p-0.5 max-[419px]:mt-3 max-[419px]:basis-full"
              >
                {LANGUAGE_OPTIONS.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLanguage(value)}
                    aria-pressed={language === value}
                    className={cn(
                      'min-w-[72px] rounded-md px-2 py-1 text-xs transition-colors duration-150',
                      language === value
                        ? 'bg-primary text-[var(--color-text-on-accent)]'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {t(`settings.general.${labelKey}`)}
                  </button>
                ))}
              </div>
            }
            className="px-4 py-3 max-[419px]:flex-wrap"
          />
        </Card>
        <Card variant="surface" className="p-0 overflow-hidden">
          <SettingRow
            icon={Clock3}
            label={t('settings.general.timeFormat')}
            trailing={
              <div
                role="group"
                aria-label={t('settings.general.timeFormat')}
                className="grid grid-cols-2 rounded-lg border border-border bg-elevated p-0.5"
              >
                {(['24h', '12h'] as TimeFormat[]).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setTimeFormat(format)}
                    aria-pressed={timeFormat === format}
                    className={cn(
                      'min-w-[58px] rounded-md px-2 py-1 text-xs transition-colors duration-150',
                      timeFormat === format
                        ? 'bg-primary text-[var(--color-text-on-accent)]'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {t(`settings.general.time${format === '24h' ? '24' : '12'}`)}
                  </button>
                ))}
              </div>
            }
            className="px-4 py-3"
          />
        </Card>
        <Card variant="surface" className="p-0 overflow-hidden">
          <SettingRow
            icon={ListEnd}
            label={t('settings.general.autoMove')}
            trailing={
              <ToggleSwitch
                checked={settings.isAutoMoveEnabled}
                onCheckedChange={(value) => updateSettings({ isAutoMoveEnabled: value })}
              />
            }
            className="px-4 py-3"
          />
        </Card>
        <Card variant="surface" className="p-0 overflow-hidden">
          <SettingRow
            icon={CheckCheck}
            label={t('settings.general.confirmDelete')}
            trailing={
              <ToggleSwitch
                checked={settings.shouldConfirmDelete}
                onCheckedChange={(value) => updateSettings({ shouldConfirmDelete: value })}
              />
            }
            className="px-4 py-3"
          />
        </Card>
      </div>
    </SettingsPage>
  )
}
