import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_STORAGE_KEY,
  LEGACY_THEME_PREFERENCE_STORAGE_KEY,
  parseDisplayPreferences,
  readDisplayPreferences,
  resolveEnvironmentLocale,
  resolveEnvironmentTheme,
  resolveEnvironmentTimeFormat,
  updateDisplayPreferences,
} from '../../src/i18n/displayPreferences'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('display preferences', () => {
  it('maps every Chinese browser locale to simplified Chinese', () => {
    expect(resolveEnvironmentLocale(['zh-TW'])).toBe('zh-CN')
    expect(resolveEnvironmentLocale(['zh-HK', 'en-US'])).toBe('zh-CN')
  })

  it('maps non-Chinese browser locales to English', () => {
    expect(resolveEnvironmentLocale(['ja-JP', 'en-GB'])).toBe('en-US')
    expect(resolveEnvironmentLocale(['en-US', 'zh-CN'])).toBe('en-US')
  })

  it('falls back to Chinese and dark when the environment is unavailable', () => {
    expect(resolveEnvironmentLocale([])).toBe('zh-CN')
    expect(resolveEnvironmentTheme(null)).toBe('dark')
  })

  it('resolves an available system appearance to an explicit theme', () => {
    expect(resolveEnvironmentTheme(false)).toBe('light')
    expect(resolveEnvironmentTheme(true)).toBe('dark')
  })

  it('resolves the environment time format to an explicit preference', () => {
    expect(resolveEnvironmentTimeFormat(true)).toBe('12h')
    expect(resolveEnvironmentTimeFormat(false)).toBe('24h')
    expect(resolveEnvironmentTimeFormat(null)).toBe('24h')
  })

  it('defaults invalid persisted values without losing valid fields', () => {
    expect(
      parseDisplayPreferences(
        '{"theme":"contrast","language":"fr-FR","timeFormat":"12h"}',
        DEFAULT_DISPLAY_PREFERENCES,
      ),
    ).toEqual({
      theme: 'dark',
      language: 'zh-CN',
      timeFormat: '12h',
    })
    expect(parseDisplayPreferences('invalid', DEFAULT_DISPLAY_PREFERENCES)).toEqual(
      DEFAULT_DISPLAY_PREFERENCES,
    )
  })

  it('migrates saved system values to the current environment once', () => {
    expect(
      parseDisplayPreferences('{"theme":"system","language":"system","timeFormat":"24h"}', {
        theme: 'light',
        language: 'en-US',
        timeFormat: '24h',
      }),
    ).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '24h',
    })
  })

  it('persists environment defaults on the first read', () => {
    localStorage.clear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    )
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      hour12: true,
    } as Intl.ResolvedDateTimeFormatOptions)

    expect(readDisplayPreferences()).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '12h',
    })
    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)!)).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '12h',
    })
  })

  it('falls back safely when browser environment APIs throw', () => {
    localStorage.clear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => {
        throw new Error('unavailable')
      }),
    )
    vi.spyOn(navigator, 'languages', 'get').mockImplementation(() => {
      throw new Error('unavailable')
    })
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
      throw new Error('unavailable')
    })

    expect(readDisplayPreferences()).toEqual(DEFAULT_DISPLAY_PREFERENCES)
  })

  it('does not query the environment when every saved preference is explicit', () => {
    localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'light', language: 'en-US', timeFormat: '12h' }),
    )
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => {
        throw new Error('should not be called')
      }),
    )
    vi.spyOn(navigator, 'languages', 'get').mockImplementation(() => {
      throw new Error('should not be read')
    })
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
      throw new Error('should not be called')
    })

    expect(readDisplayPreferences()).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '12h',
    })
  })

  it('reads the legacy theme when the combined preferences do not contain one', () => {
    localStorage.clear()
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'dark')
    localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ language: 'en-US', timeFormat: '12h' }),
    )

    expect(readDisplayPreferences()).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '12h',
    })
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)!)).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '12h',
    })
  })

  it('updates one preference without overwriting the others', () => {
    localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', language: 'zh-CN', timeFormat: '24h' }),
    )

    expect(updateDisplayPreferences({ language: 'en-US' })).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '24h',
    })
  })
})
