export const THEME_PREFERENCE_STORAGE_KEY = 'flowboard-theme-preference'

export type ThemePreference = 'system' | 'light' | 'dark'
export type EffectiveTheme = Exclude<ThemePreference, 'system'>

const LEGACY_INSTALL_KEYS = [
  'flowboard-checklist',
  'nte-checklist',
  'flowboard-settings',
  'flowboard-ui-preferences',
] as const

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function hasExistingInstallation(storage: Storage | null = getStorage()): boolean {
  return storage ? LEGACY_INSTALL_KEYS.some((key) => storage.getItem(key) !== null) : false
}

export function getDefaultThemePreference(storage: Storage | null = getStorage()): ThemePreference {
  return hasExistingInstallation(storage) ? 'dark' : 'system'
}

export function parseThemePreference(
  value: string | null,
  fallback: ThemePreference,
): ThemePreference {
  return isThemePreference(value) ? value : fallback
}

export function readThemePreference(storage: Storage | null = getStorage()): ThemePreference {
  const fallback = getDefaultThemePreference(storage)
  return storage
    ? parseThemePreference(storage.getItem(THEME_PREFERENCE_STORAGE_KEY), fallback)
    : fallback
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: Storage | null = getStorage(),
): void {
  storage?.setItem(THEME_PREFERENCE_STORAGE_KEY, preference)
}

export function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: EffectiveTheme = getSystemTheme(),
): EffectiveTheme {
  return preference === 'system' ? systemTheme : preference
}

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}
