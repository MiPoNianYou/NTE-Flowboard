import { beforeEach, describe, expect, it } from 'vitest'
import { LEGACY_THEME_PREFERENCE_STORAGE_KEY } from '../../src/i18n/displayPreferences'
import { parseThemePreference, readThemePreference } from '../../src/theme/themePreferences'

beforeEach(() => {
  localStorage.clear()
})

describe('theme preferences', () => {
  it('keeps a valid saved preference', () => {
    expect(parseThemePreference('light', 'dark')).toBe('light')
    expect(parseThemePreference('dark', 'light')).toBe('dark')
  })

  it('treats the removed system preference as a legacy value', () => {
    expect(parseThemePreference('system', 'dark')).toBe('dark')
  })

  it('migrates a legacy system theme to the resolved environment default', () => {
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'system')

    expect(readThemePreference()).toBe('dark')
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
  })
})
