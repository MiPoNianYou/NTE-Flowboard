export type SupportedLocale = 'zh-CN' | 'en-US'
export type LanguagePreference = SupportedLocale
export type TimeFormat = '24h' | '12h'
export type ThemePreference = 'light' | 'dark'

export interface DisplayPreferences {
  theme: ThemePreference
  language: LanguagePreference
  timeFormat: TimeFormat
}

export const DISPLAY_PREFERENCES_STORAGE_KEY = 'flowboard-display-preferences'
export const LEGACY_THEME_PREFERENCE_STORAGE_KEY = 'flowboard-theme-preference'

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: 'dark',
  language: 'zh-CN',
  timeFormat: '24h',
}

export function resolveEnvironmentLocale(
  languages: readonly string[] = getBrowserLanguages(),
): SupportedLocale {
  if (languages.length === 0) return DEFAULT_DISPLAY_PREFERENCES.language
  return languages[0].toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function resolveEnvironmentTheme(
  prefersDark: boolean | null = getPrefersDark(),
): ThemePreference {
  if (prefersDark === null) return DEFAULT_DISPLAY_PREFERENCES.theme
  return prefersDark ? 'dark' : 'light'
}

export function resolveEnvironmentTimeFormat(
  hour12: boolean | null = getEnvironmentHour12(),
): TimeFormat {
  if (hour12 === null) return DEFAULT_DISPLAY_PREFERENCES.timeFormat
  return hour12 ? '12h' : '24h'
}

function getDefaultDisplayPreferences(): DisplayPreferences {
  return {
    theme: resolveEnvironmentTheme(),
    language: resolveEnvironmentLocale(),
    timeFormat: resolveEnvironmentTimeFormat(),
  }
}

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  try {
    if (navigator.languages?.length > 0 && typeof navigator.languages[0] === 'string') {
      return navigator.languages
    }
    return typeof navigator.language === 'string' && navigator.language ? [navigator.language] : []
  } catch {
    return []
  }
}

function getPrefersDark(): boolean | null {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return null
    const matches = window.matchMedia('(prefers-color-scheme: dark)').matches
    return typeof matches === 'boolean' ? matches : null
  } catch {
    return null
  }
}

function getEnvironmentHour12(): boolean | null {
  try {
    const hour12 = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12
    return typeof hour12 === 'boolean' ? hour12 : null
  } catch {
    return null
  }
}

function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'zh-CN' || value === 'en-US'
}

function isTimeFormat(value: unknown): value is TimeFormat {
  return value === '24h' || value === '12h'
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark'
}

interface DisplayPreferenceFallbacks {
  theme: () => ThemePreference
  language: () => LanguagePreference
  timeFormat: () => TimeFormat
}

function parseDisplayPreferencesWithFallbacks(
  raw: string | null,
  fallbacks: DisplayPreferenceFallbacks,
): DisplayPreferences {
  let parsed: Record<string, unknown> = {}

  if (raw) {
    try {
      const value: unknown = JSON.parse(raw)
      if (value && typeof value === 'object') parsed = value as Record<string, unknown>
    } catch {
      // Invalid storage is replaced with resolved fallback values below.
    }
  }

  return {
    theme: isThemePreference(parsed.theme) ? parsed.theme : fallbacks.theme(),
    language: isLanguagePreference(parsed.language) ? parsed.language : fallbacks.language(),
    timeFormat: isTimeFormat(parsed.timeFormat) ? parsed.timeFormat : fallbacks.timeFormat(),
  }
}

export function parseDisplayPreferences(
  raw: string | null,
  defaults?: DisplayPreferences,
): DisplayPreferences {
  let resolvedDefaults = defaults
  const getDefaults = () => {
    resolvedDefaults ??= getDefaultDisplayPreferences()
    return resolvedDefaults
  }

  return parseDisplayPreferencesWithFallbacks(raw, {
    theme: () => getDefaults().theme,
    language: () => getDefaults().language,
    timeFormat: () => getDefaults().timeFormat,
  })
}

export function readDisplayPreferences(storage: Storage | null = getStorage()): DisplayPreferences {
  if (!storage) return getDefaultDisplayPreferences()

  const legacyTheme = storage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)
  const rawPreferences = storage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)
  const preferences = parseDisplayPreferencesWithFallbacks(rawPreferences, {
    theme: () => (isThemePreference(legacyTheme) ? legacyTheme : resolveEnvironmentTheme()),
    language: resolveEnvironmentLocale,
    timeFormat: resolveEnvironmentTimeFormat,
  })
  const serializedPreferences = JSON.stringify(preferences)

  if (rawPreferences !== serializedPreferences) {
    storage.setItem(DISPLAY_PREFERENCES_STORAGE_KEY, serializedPreferences)
  }
  if (legacyTheme !== null) storage.removeItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)

  return preferences
}

function saveDisplayPreferences(
  preferences: DisplayPreferences,
  storage: Storage | null = getStorage(),
): void {
  if (!storage) return
  storage.setItem(DISPLAY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  storage.removeItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)
}

export function updateDisplayPreferences(
  changes: Partial<DisplayPreferences>,
  storage: Storage | null = getStorage(),
): DisplayPreferences {
  const next = { ...readDisplayPreferences(storage), ...changes }
  saveDisplayPreferences(next, storage)
  return next
}

export function getEffectiveLocale(): SupportedLocale {
  return readDisplayPreferences().language
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}
