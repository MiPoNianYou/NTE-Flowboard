import { type ReactNode } from 'react'
import { ListEnd, CheckCheck, Languages, Clock3, Monitor, Moon, Sun } from 'lucide-react'
import { SettingsPage } from './SettingsPage'
import { ToggleSwitch } from '../base/ToggleSwitch'
import { SettingRow } from './SettingRow'
import { Card } from '../base/Card'
import type { SettingsPageBaseProps } from './SettingsPage'
import { useSettings } from '../../context/SettingsContext'
import { useDisplayPreferences } from '../../context/DisplayPreferencesContext'
import type { LanguagePreference, TimeFormat } from '../../i18n/displayPreferences'
import type { ThemePreference } from '../../theme/themePreferences'
import { useTheme } from '../../context/ThemeContext'
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

const THEME_OPTIONS: {
  value: ThemePreference
  labelKey: 'themeLight' | 'themeSystem' | 'themeDark'
  Icon: typeof Sun
}[] = [
  { value: 'light', labelKey: 'themeLight', Icon: Sun },
  { value: 'system', labelKey: 'themeSystem', Icon: Monitor },
  { value: 'dark', labelKey: 'themeDark', Icon: Moon },
]

const THREE_OPTION_SEGMENTED_CONTROL =
  'grid w-full basis-full grid-cols-3 rounded-lg border border-border bg-elevated p-0.5 mt-3'

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-semibold text-text-secondary">{title}</h3>
      <Card variant="surface" className="p-0 overflow-hidden divide-y divide-border">
        {children}
      </Card>
    </section>
  )
}

export function SettingsGeneral({ onBack, isEmbedded }: SettingsPageBaseProps) {
  const { t } = useTranslation()
  const { settings, updateSettings } = useSettings()
  const { language, timeFormat, setLanguage, setTimeFormat } = useDisplayPreferences()
  const { themePreference, setThemePreference } = useTheme()

  return (
    <SettingsPage title={t('settings.nav.general')} onBack={onBack} isEmbedded={isEmbedded}>
      <div className="space-y-5">
        <SettingsGroup title={t('settings.general.taskBehavior')}>
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
        </SettingsGroup>
        <SettingsGroup title={t('settings.general.preferences')}>
          <SettingRow
            icon={Monitor}
            label={t('settings.general.theme')}
            trailing={
              <div
                role="group"
                aria-label={t('settings.general.theme')}
                className={THREE_OPTION_SEGMENTED_CONTROL}
              >
                {THEME_OPTIONS.map(({ value, labelKey, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setThemePreference(value)}
                    aria-pressed={themePreference === value}
                    className={cn(
                      'min-w-[72px] inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs transition-colors duration-150',
                      themePreference === value
                        ? 'bg-primary text-[var(--color-text-on-accent)]'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-3" />
                    {t(`settings.general.${labelKey}`)}
                  </button>
                ))}
              </div>
            }
            className="px-4 py-3 flex-wrap"
          />
          <SettingRow
            icon={Languages}
            label={t('settings.general.language')}
            trailing={
              <div
                role="group"
                aria-label={t('settings.general.language')}
                className={THREE_OPTION_SEGMENTED_CONTROL}
              >
                {LANGUAGE_OPTIONS.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLanguage(value)}
                    aria-pressed={language === value}
                    className={cn(
                      'min-w-[72px] inline-flex items-center justify-center rounded-md px-2 py-1 text-xs transition-colors duration-150',
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
            className="px-4 py-3 flex-wrap"
          />
          <SettingRow
            icon={Clock3}
            label={t('settings.general.timeFormat')}
            trailing={
              <div
                role="group"
                aria-label={t('settings.general.timeFormat')}
                className="grid w-full basis-full grid-cols-2 rounded-lg border border-border bg-elevated p-0.5 mt-3"
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
            className="px-4 py-3 flex-wrap"
          />
        </SettingsGroup>
      </div>
    </SettingsPage>
  )
}
