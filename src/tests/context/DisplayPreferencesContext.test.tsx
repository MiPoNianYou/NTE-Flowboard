import { act, render, screen } from '@testing-library/react'
import {
  DisplayPreferencesProvider,
  useDisplayPreferences,
} from '../../context/DisplayPreferencesContext'
import { DISPLAY_PREFERENCES_STORAGE_KEY } from '../../i18n/displayPreferences'

function PreferenceProbe() {
  const { language, timeFormat, locale } = useDisplayPreferences()
  return <output>{`${language}|${timeFormat}|${locale}`}</output>
}

describe('DisplayPreferencesProvider', () => {
  it('applies preferences changed in another browser tab', () => {
    render(
      <DisplayPreferencesProvider>
        <PreferenceProbe />
      </DisplayPreferencesProvider>,
    )

    const nextPreferences = JSON.stringify({ language: 'en-US', timeFormat: '12h' })
    localStorage.setItem(DISPLAY_PREFERENCES_STORAGE_KEY, nextPreferences)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: DISPLAY_PREFERENCES_STORAGE_KEY,
          newValue: nextPreferences,
        }),
      )
    })

    expect(screen.getByText('en-US|12h|en-US')).toBeVisible()
  })
})
