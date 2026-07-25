import { type ReactNode } from 'react'
import {
  Check,
  ChevronRight,
  CheckCheck,
  Clock3,
  Languages,
  ListEnd,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react'
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

export type MobileGeneralPreference = 'theme' | 'language' | 'timeFormat'

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

function MobileSettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="px-1 text-xs font-semibold text-text-secondary">{title}</h3>
      <Card variant="surface" className="overflow-hidden p-0 divide-y divide-border">
        {children}
      </Card>
    </section>
  )
}

interface SettingsGeneralProps extends SettingsPageBaseProps {
  mobile?: boolean
  onOpenPreference?: (preference: MobileGeneralPreference) => void
}

export function SettingsGeneral({
  onBack,
  isEmbedded,
  mobile = false,
  onOpenPreference,
}: SettingsGeneralProps) {
  const { t } = useTranslation()
  const { settings, updateSettings } = useSettings()
  const { language, timeFormat, setLanguage, setTimeFormat } = useDisplayPreferences()
  const { themePreference, setThemePreference } = useTheme()

  if (mobile) {
    const preferenceValues: Record<MobileGeneralPreference, string> = {
      theme: t(
        `settings.general.${THEME_OPTIONS.find((option) => option.value === themePreference)?.labelKey ?? 'themeSystem'}`,
      ),
      language: t(
        `settings.general.${LANGUAGE_OPTIONS.find((option) => option.value === language)?.labelKey ?? 'languageSystem'}`,
      ),
      timeFormat: t(`settings.general.time${timeFormat === '24h' ? '24' : '12'}`),
    }

    return (
      <SettingsPage title={t('settings.nav.general')} onBack={onBack} isEmbedded={isEmbedded}>
        <div className="space-y-5">
          <MobileSettingsGroup title={t('settings.general.taskBehavior')}>
            <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-2">
              <span className="text-footnote font-medium text-text-primary">
                {t('settings.general.autoMove')}
              </span>
              <ToggleSwitch
                checked={settings.isAutoMoveEnabled}
                onCheckedChange={(value) => updateSettings({ isAutoMoveEnabled: value })}
              />
            </div>
            <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-2">
              <span className="text-footnote font-medium text-text-primary">
                {t('settings.general.confirmDelete')}
              </span>
              <ToggleSwitch
                checked={settings.shouldConfirmDelete}
                onCheckedChange={(value) => updateSettings({ shouldConfirmDelete: value })}
              />
            </div>
          </MobileSettingsGroup>
          <MobileSettingsGroup title={t('settings.general.preferences')}>
            {(['theme', 'language', 'timeFormat'] as MobileGeneralPreference[]).map(
              (preference) => (
                <button
                  key={preference}
                  type="button"
                  onClick={() => onOpenPreference?.(preference)}
                  className="flex min-h-14 w-full items-center gap-4 px-4 py-2 text-left hover:bg-surface-hover"
                >
                  <span className="min-w-0 flex-1 text-footnote font-medium text-text-primary">
                    {t(`settings.general.${preference}`)}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1 text-sm text-text-secondary">
                    <span className="truncate">{preferenceValues[preference]}</span>
                    <ChevronRight
                      className="size-4 flex-shrink-0 text-text-muted"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              ),
            )}
          </MobileSettingsGroup>
        </div>
      </SettingsPage>
    )
  }

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
                        ? 'bg-primary text-white'
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
                        ? 'bg-primary text-white'
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
                        ? 'bg-primary text-white'
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

export function SettingsGeneralChoice({ preference }: { preference: MobileGeneralPreference }) {
  const { t } = useTranslation()
  const { language, timeFormat, setLanguage, setTimeFormat } = useDisplayPreferences()
  const { themePreference, setThemePreference } = useTheme()

  const choices = (() => {
    if (preference === 'theme') {
      return THEME_OPTIONS.map(({ value, labelKey }) => ({
        value,
        label: t(`settings.general.${labelKey}`),
        isSelected: themePreference === value,
        onSelect: () => setThemePreference(value),
      }))
    }

    if (preference === 'language') {
      return LANGUAGE_OPTIONS.map(({ value, labelKey }) => ({
        value,
        label: t(`settings.general.${labelKey}`),
        isSelected: language === value,
        onSelect: () => setLanguage(value),
      }))
    }

    return (['24h', '12h'] as TimeFormat[]).map((value) => ({
      value,
      label: t(`settings.general.time${value === '24h' ? '24' : '12'}`),
      isSelected: timeFormat === value,
      onSelect: () => setTimeFormat(value),
    }))
  })()

  return (
    <Card variant="surface" className="overflow-hidden p-0 divide-y divide-border">
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          onClick={choice.onSelect}
          aria-pressed={choice.isSelected}
          className={cn(
            'flex min-h-14 w-full items-center justify-between gap-4 px-4 py-2 text-left hover:bg-surface-hover',
            choice.isSelected && 'text-primary',
          )}
        >
          <span className="text-footnote font-medium">{choice.label}</span>
          {choice.isSelected && <Check className="size-4 flex-shrink-0" aria-hidden="true" />}
        </button>
      ))}
    </Card>
  )
}
