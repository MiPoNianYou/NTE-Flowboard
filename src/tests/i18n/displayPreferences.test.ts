import {
  DEFAULT_DISPLAY_PREFERENCES,
  parseDisplayPreferences,
  resolveLocale,
  resolveSystemLocale,
} from '../../i18n/displayPreferences'

describe('display preferences', () => {
  it('maps every Chinese browser locale to simplified Chinese', () => {
    expect(resolveSystemLocale(['zh-TW'])).toBe('zh-CN')
    expect(resolveSystemLocale(['zh-HK', 'en-US'])).toBe('zh-CN')
  })

  it('maps non-Chinese browser locales to English', () => {
    expect(resolveSystemLocale(['ja-JP', 'en-GB'])).toBe('en-US')
    expect(resolveSystemLocale(['en-US', 'zh-CN'])).toBe('en-US')
  })

  it('lets an explicit language override the browser locale', () => {
    expect(resolveLocale('en-US', ['zh-CN'])).toBe('en-US')
    expect(resolveLocale('zh-CN', ['en-US'])).toBe('zh-CN')
  })

  it('defaults invalid persisted values without losing valid fields', () => {
    expect(parseDisplayPreferences('{"language":"fr-FR","timeFormat":"12h"}')).toEqual({
      language: 'system',
      timeFormat: '12h',
    })
    expect(parseDisplayPreferences('invalid')).toEqual(DEFAULT_DISPLAY_PREFERENCES)
  })
})
