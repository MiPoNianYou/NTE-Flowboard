import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCAL_UI_PREFERENCES,
  LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY,
  LOCAL_UI_PREFERENCES_STORAGE_KEY,
  LEGACY_THEME_PREFERENCE_STORAGE_KEY,
  OLDEST_HIDDEN_SECTION_OPEN_STORAGE_KEY,
  isThemePreference,
  parseLocalUiPreferences,
  readLocalUiPreferences,
  resolveEnvironmentLocale,
  resolveEnvironmentTheme,
  resolveEnvironmentTimeFormat,
  updateLocalUiPreferences,
} from '../../src/utils/localUiPreferences'
import { subscribeLegacyStorageEvents } from '../../src/utils/legacyStorageEvents'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('local UI preferences', () => {
  it('accepts only supported explicit theme values', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('system')).toBe(false)
  })

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
      parseLocalUiPreferences(
        '{"theme":"contrast","language":"fr-FR","timeFormat":"12h"}',
        DEFAULT_LOCAL_UI_PREFERENCES,
      ),
    ).toEqual({
      theme: 'dark',
      language: 'zh-CN',
      timeFormat: '12h',
      hiddenSectionOpen: true,
    })
    expect(parseLocalUiPreferences('invalid', DEFAULT_LOCAL_UI_PREFERENCES)).toEqual(
      DEFAULT_LOCAL_UI_PREFERENCES,
    )
  })

  it('migrates saved system values to the current environment once', () => {
    expect(
      parseLocalUiPreferences('{"theme":"system","language":"system","timeFormat":"24h"}', {
        theme: 'light',
        language: 'en-US',
        timeFormat: '24h',
        hiddenSectionOpen: false,
      }),
    ).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '24h',
      hiddenSectionOpen: false,
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

    expect(readLocalUiPreferences()).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '12h',
      hiddenSectionOpen: true,
    })
    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '12h',
      hiddenSectionOpen: true,
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

    expect(readLocalUiPreferences()).toEqual(DEFAULT_LOCAL_UI_PREFERENCES)
  })

  it('does not query the environment when every saved preference is explicit', () => {
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        theme: 'light',
        language: 'en-US',
        timeFormat: '12h',
        hiddenSectionOpen: false,
      }),
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

    expect(readLocalUiPreferences()).toEqual({
      theme: 'light',
      language: 'en-US',
      timeFormat: '12h',
      hiddenSectionOpen: false,
    })
  })

  it('normalizes a damaged object without creating a corrupted backup', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN'])
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      hour12: false,
    } as Intl.ResolvedDateTimeFormatOptions)
    localStorage.setItem(LOCAL_UI_PREFERENCES_STORAGE_KEY, '{broken')

    expect(readLocalUiPreferences()).toEqual(DEFAULT_LOCAL_UI_PREFERENCES)
    expect(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify(DEFAULT_LOCAL_UI_PREFERENCES),
    )
    expect(localStorage.getItem('flowboard-display-preferences-corrupted-backup')).toBeNull()
  })

  it('removes an existing corrupted backup without blocking preference loading', () => {
    localStorage.setItem('flowboard-display-preferences-corrupted-backup', '{broken')

    expect(readLocalUiPreferences()).toEqual(DEFAULT_LOCAL_UI_PREFERENCES)
    expect(localStorage.getItem('flowboard-display-preferences-corrupted-backup')).toBeNull()
  })

  it('reports backup cleanup failure without blocking preference loading', () => {
    localStorage.setItem('flowboard-display-preferences-corrupted-backup', '{broken')
    const events: string[] = []
    const unsubscribe = subscribeLegacyStorageEvents((event) => events.push(event))
    const originalRemoveItem = Storage.prototype.removeItem
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key !== 'flowboard-display-preferences-corrupted-backup') {
        originalRemoveItem.call(this, key)
      }
    })

    expect(readLocalUiPreferences()).toEqual(DEFAULT_LOCAL_UI_PREFERENCES)
    expect(localStorage.getItem('flowboard-display-preferences-corrupted-backup')).toBe('{broken')
    expect(events).toContain('failed')
    unsubscribe()
  })

  it('reads the legacy theme when the combined preferences do not contain one', () => {
    localStorage.clear()
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'dark')
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ language: 'en-US', timeFormat: '12h' }),
    )

    expect(readLocalUiPreferences()).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '12h',
      hiddenSectionOpen: true,
    })
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '12h',
      hiddenSectionOpen: true,
    })
  })

  it('updates one preference without overwriting the others', () => {
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', language: 'zh-CN', timeFormat: '24h' }),
    )

    expect(updateLocalUiPreferences({ language: 'en-US' })).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '24h',
      hiddenSectionOpen: true,
    })
  })

  it('migrates the current hidden-section key before the oldest key', () => {
    localStorage.clear()
    localStorage.setItem(LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY, 'false')
    localStorage.setItem(OLDEST_HIDDEN_SECTION_OPEN_STORAGE_KEY, 'true')

    expect(readLocalUiPreferences().hiddenSectionOpen).toBe(false)
    expect(localStorage.getItem(LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(OLDEST_HIDDEN_SECTION_OPEN_STORAGE_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      hiddenSectionOpen: false,
    })
  })

  it('keeps the new object value when a legacy hidden-section key conflicts', () => {
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        theme: 'dark',
        language: 'zh-CN',
        timeFormat: '24h',
        hiddenSectionOpen: true,
      }),
    )
    localStorage.setItem(LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY, 'false')
    const events: string[] = []
    const unsubscribe = subscribeLegacyStorageEvents((event) => events.push(event))

    expect(readLocalUiPreferences().hiddenSectionOpen).toBe(true)
    expect(localStorage.getItem(LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY)).toBeNull()
    expect(events).toContain('conflict')
    unsubscribe()
  })

  it('keeps legacy hidden-section keys when the combined object cannot be confirmed', () => {
    localStorage.clear()
    localStorage.setItem(LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY, 'false')
    const originalGetItem = Storage.prototype.getItem
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === LOCAL_UI_PREFERENCES_STORAGE_KEY) return null
      return originalGetItem.call(this, key)
    })

    expect(readLocalUiPreferences().hiddenSectionOpen).toBe(false)
    expect(originalGetItem.call(localStorage, LEGACY_HIDDEN_SECTION_OPEN_STORAGE_KEY)).toBe('false')
  })

  it('keeps a conflicting legacy theme while current preferences win', () => {
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'light')
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', language: 'zh-CN', timeFormat: '24h' }),
    )
    expect(readLocalUiPreferences().theme).toBe('dark')
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBe('light')
  })

  it('deletes an invalid legacy theme', () => {
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'system')
    readLocalUiPreferences()
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
  })

  it('reports an incomplete migration when saving cannot delete the legacy theme', () => {
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'light')
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', language: 'zh-CN', timeFormat: '24h' }),
    )
    const events: string[] = []
    const unsubscribe = subscribeLegacyStorageEvents((event) => events.push(event))
    const originalRemoveItem = Storage.prototype.removeItem
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key !== LEGACY_THEME_PREFERENCE_STORAGE_KEY) {
        return originalRemoveItem.call(this, key)
      }
    })

    updateLocalUiPreferences({ language: 'en-US' })

    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBe('light')
    expect(events).toContain('failed')
    unsubscribe()
  })
})
