import { removeStorageKey } from './legacyStorageMigration'
import { reportLegacyStorageConflict, reportLegacyStorageFailure } from './legacyStorageEvents'
import type {
  LanguagePreference,
  LocalUiPreferences,
  SupportedLocale,
  ThemePreference,
  TimeFormat,
} from '../types'

export const LOCAL_UI_PREFERENCES_STORAGE_KEY = 'flowboard-display-preferences'
const OBSOLETE_LOCAL_UI_PREFERENCES_CORRUPTED_BACKUP_STORAGE_KEY = `${LOCAL_UI_PREFERENCES_STORAGE_KEY}-corrupted-backup`
export const LEGACY_THEME_PREFERENCE_STORAGE_KEY = 'flowboard-theme-preference'
export const LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY = 'flowboard-hidden-section-open'
export const OLDEST_HIDDEN_SECTION_OPEN_STORAGE_KEY = 'nte-hidden-section-open'

export const DEFAULT_LOCAL_UI_PREFERENCES: LocalUiPreferences = {
  theme: 'dark',
  language: 'zh-CN',
  timeFormat: '24h',
  hiddenSectionOpen: true,
}

export function resolveEnvironmentLocale(
  languages: readonly string[] = getBrowserLanguages(),
): SupportedLocale {
  if (languages.length === 0) return DEFAULT_LOCAL_UI_PREFERENCES.language
  return languages[0].toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function resolveEnvironmentTheme(
  prefersDark: boolean | null = getPrefersDark(),
): ThemePreference {
  if (prefersDark === null) return DEFAULT_LOCAL_UI_PREFERENCES.theme
  return prefersDark ? 'dark' : 'light'
}

export function resolveEnvironmentTimeFormat(
  hour12: boolean | null = getEnvironmentHour12(),
): TimeFormat {
  if (hour12 === null) return DEFAULT_LOCAL_UI_PREFERENCES.timeFormat
  return hour12 ? '12h' : '24h'
}

function getDefaultLocalUiPreferences(): LocalUiPreferences {
  return {
    theme: resolveEnvironmentTheme(),
    language: resolveEnvironmentLocale(),
    timeFormat: resolveEnvironmentTimeFormat(),
    hiddenSectionOpen: DEFAULT_LOCAL_UI_PREFERENCES.hiddenSectionOpen,
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

interface LocalUiPreferenceFallbacks {
  theme: () => ThemePreference
  language: () => LanguagePreference
  timeFormat: () => TimeFormat
  hiddenSectionOpen: () => boolean
}

function parseLocalUiPreferencesWithFallbacks(
  raw: string | null,
  fallbacks: LocalUiPreferenceFallbacks,
): LocalUiPreferences {
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
    hiddenSectionOpen:
      typeof parsed.hiddenSectionOpen === 'boolean'
        ? parsed.hiddenSectionOpen
        : fallbacks.hiddenSectionOpen(),
  }
}

export function parseLocalUiPreferences(
  raw: string | null,
  defaults?: LocalUiPreferences,
): LocalUiPreferences {
  let resolvedDefaults = defaults
  const getDefaults = () => {
    resolvedDefaults ??= getDefaultLocalUiPreferences()
    return resolvedDefaults
  }

  return parseLocalUiPreferencesWithFallbacks(raw, {
    theme: () => getDefaults().theme,
    language: () => getDefaults().language,
    timeFormat: () => getDefaults().timeFormat,
    hiddenSectionOpen: () => getDefaults().hiddenSectionOpen,
  })
}

function parseStoredRecord(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function parseStoredBoolean(raw: string | null): boolean | null {
  if (raw === 'true') return true
  if (raw === 'false') return false
  return null
}

function removeLegacyHiddenSectionKeys(storage: Storage): void {
  try {
    for (const key of [
      LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY,
      OLDEST_HIDDEN_SECTION_OPEN_STORAGE_KEY,
    ]) {
      if (storage.getItem(key) !== null && !removeStorageKey(storage, key)) {
        reportLegacyStorageFailure()
      }
    }
  } catch {
    reportLegacyStorageFailure()
  }
}

function removeObsoleteLocalUiPreferencesBackup(storage: Storage): void {
  try {
    if (
      storage.getItem(OBSOLETE_LOCAL_UI_PREFERENCES_CORRUPTED_BACKUP_STORAGE_KEY) !== null &&
      !removeStorageKey(storage, OBSOLETE_LOCAL_UI_PREFERENCES_CORRUPTED_BACKUP_STORAGE_KEY)
    ) {
      reportLegacyStorageFailure()
    }
  } catch {
    reportLegacyStorageFailure()
  }
}

export function readLocalUiPreferences(storage: Storage | null = getStorage()): LocalUiPreferences {
  if (!storage) return getDefaultLocalUiPreferences()

  removeObsoleteLocalUiPreferencesBackup(storage)
  const legacyTheme = storage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)
  const rawPreferences = storage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)
  const parsedPreferences = parseStoredRecord(rawPreferences)
  const parsedCurrentTheme = isThemePreference(parsedPreferences.theme)
    ? parsedPreferences.theme
    : null
  const parsedCurrentHiddenSectionOpen =
    typeof parsedPreferences.hiddenSectionOpen === 'boolean'
      ? parsedPreferences.hiddenSectionOpen
      : null
  const legacyHiddenSectionOpen = parseStoredBoolean(
    storage.getItem(LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY),
  )
  const oldestHiddenSectionOpen = parseStoredBoolean(
    storage.getItem(OLDEST_HIDDEN_SECTION_OPEN_STORAGE_KEY),
  )
  const validLegacyTheme = isThemePreference(legacyTheme) ? legacyTheme : null
  if (
    legacyTheme !== null &&
    !validLegacyTheme &&
    !removeStorageKey(storage, LEGACY_THEME_PREFERENCE_STORAGE_KEY)
  ) {
    reportLegacyStorageFailure()
  }
  if (validLegacyTheme && parsedCurrentTheme && parsedCurrentTheme !== validLegacyTheme) {
    reportLegacyStorageConflict()
  }
  const preferredHiddenSectionOpen =
    parsedCurrentHiddenSectionOpen ??
    legacyHiddenSectionOpen ??
    oldestHiddenSectionOpen ??
    DEFAULT_LOCAL_UI_PREFERENCES.hiddenSectionOpen
  if (
    [legacyHiddenSectionOpen, oldestHiddenSectionOpen].some(
      (value) => value !== null && value !== preferredHiddenSectionOpen,
    )
  ) {
    reportLegacyStorageConflict()
  }

  const preferences = parseLocalUiPreferencesWithFallbacks(rawPreferences, {
    theme: () => parsedCurrentTheme ?? validLegacyTheme ?? resolveEnvironmentTheme(),
    language: resolveEnvironmentLocale,
    timeFormat: resolveEnvironmentTimeFormat,
    hiddenSectionOpen: () => preferredHiddenSectionOpen,
  })
  const serializedPreferences = JSON.stringify(preferences)
  let persisted = rawPreferences === serializedPreferences

  if (!persisted) {
    try {
      storage.setItem(LOCAL_UI_PREFERENCES_STORAGE_KEY, serializedPreferences)
    } catch {
      return preferences
    }
    persisted = storage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY) === serializedPreferences
  }
  if (!persisted) return preferences

  if (validLegacyTheme && (!parsedCurrentTheme || parsedCurrentTheme === validLegacyTheme)) {
    try {
      if (!removeStorageKey(storage, LEGACY_THEME_PREFERENCE_STORAGE_KEY)) {
        reportLegacyStorageFailure()
        return preferences
      }
    } catch {
      return preferences
    }
  }
  removeLegacyHiddenSectionKeys(storage)

  return preferences
}

function saveLocalUiPreferences(
  preferences: LocalUiPreferences,
  storage: Storage | null = getStorage(),
): void {
  if (!storage) return
  const serialized = JSON.stringify(preferences)
  storage.setItem(LOCAL_UI_PREFERENCES_STORAGE_KEY, serialized)
  if (storage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY) !== serialized) return
  if (!removeStorageKey(storage, LEGACY_THEME_PREFERENCE_STORAGE_KEY)) {
    reportLegacyStorageFailure()
  }
  removeLegacyHiddenSectionKeys(storage)
}

export function updateLocalUiPreferences(
  changes: Partial<LocalUiPreferences>,
  storage: Storage | null = getStorage(),
): LocalUiPreferences {
  const next = { ...readLocalUiPreferences(storage), ...changes }
  saveLocalUiPreferences(next, storage)
  return next
}

export function getEffectiveLocale(): SupportedLocale {
  return readLocalUiPreferences().language
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}
