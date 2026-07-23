import { beforeEach, describe, expect, it } from 'vitest'
import {
  getDefaultThemePreference,
  parseThemePreference,
  resolveTheme,
  THEME_PREFERENCE_STORAGE_KEY,
} from '../../theme/themePreferences'

beforeEach(() => {
  localStorage.clear()
})

describe('theme preferences', () => {
  it('defaults a fresh installation to the system appearance', () => {
    expect(getDefaultThemePreference()).toBe('system')
  })

  it('keeps existing installations in the established dark appearance', () => {
    localStorage.setItem('flowboard-checklist', JSON.stringify({ daily: [] }))

    expect(getDefaultThemePreference()).toBe('dark')
  })

  it('keeps a valid saved preference over the migration default', () => {
    localStorage.setItem('flowboard-checklist', JSON.stringify({ daily: [] }))
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'light')

    expect(parseThemePreference(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY), 'dark')).toBe(
      'light',
    )
  })

  it('resolves system and explicit preferences predictably', () => {
    expect(resolveTheme('system', 'light')).toBe('light')
    expect(resolveTheme('system', 'dark')).toBe('dark')
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(resolveTheme('dark', 'light')).toBe('dark')
  })
})
