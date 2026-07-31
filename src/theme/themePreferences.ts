import {
  isThemePreference,
  readDisplayPreferences,
  updateDisplayPreferences,
  type ThemePreference,
} from '../i18n/displayPreferences'

export type { ThemePreference }

export type EffectiveTheme = ThemePreference

export function parseThemePreference(
  value: string | null,
  fallback: ThemePreference,
): ThemePreference {
  return isThemePreference(value) ? value : fallback
}

export function readThemePreference(storage?: Storage | null): ThemePreference {
  return readDisplayPreferences(storage).theme
}

export function saveThemePreference(preference: ThemePreference, storage?: Storage | null): void {
  updateDisplayPreferences({ theme: preference }, storage)
}
