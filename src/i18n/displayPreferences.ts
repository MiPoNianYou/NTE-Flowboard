export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type LanguagePreference = 'system' | SupportedLocale
export type TimeFormat = '24h' | '12h'

export interface DisplayPreferences {
  language: LanguagePreference
  timeFormat: TimeFormat
}

export const DISPLAY_PREFERENCES_STORAGE_KEY = 'flowboard-display-preferences'

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  language: 'system',
  timeFormat: '24h',
}

export function resolveSystemLocale(languages: readonly string[] = []): SupportedLocale {
  return languages[0]?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function resolveLocale(
  preference: LanguagePreference,
  languages: readonly string[] = getBrowserLanguages(),
): SupportedLocale {
  return preference === 'system' ? resolveSystemLocale(languages) : preference
}

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language]
}

function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || value === 'zh-CN' || value === 'en-US'
}

function isTimeFormat(value: unknown): value is TimeFormat {
  return value === '24h' || value === '12h'
}

export function parseDisplayPreferences(raw: string | null): DisplayPreferences {
  if (!raw) return { ...DEFAULT_DISPLAY_PREFERENCES }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      language: isLanguagePreference(parsed.language)
        ? parsed.language
        : DEFAULT_DISPLAY_PREFERENCES.language,
      timeFormat: isTimeFormat(parsed.timeFormat)
        ? parsed.timeFormat
        : DEFAULT_DISPLAY_PREFERENCES.timeFormat,
    }
  } catch {
    return { ...DEFAULT_DISPLAY_PREFERENCES }
  }
}

export function readDisplayPreferences(): DisplayPreferences {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_DISPLAY_PREFERENCES }
  return parseDisplayPreferences(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY))
}

export function saveDisplayPreferences(preferences: DisplayPreferences): void {
  localStorage.setItem(DISPLAY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
}

export function getEffectiveLocale(): SupportedLocale {
  return resolveLocale(readDisplayPreferences().language)
}
