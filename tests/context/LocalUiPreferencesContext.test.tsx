import { act, render, screen } from '@testing-library/react'
import {
  LocalUiPreferencesProvider,
  useLocalUiPreferences,
} from '../../src/context/LocalUiPreferencesContext'
import { LOCAL_UI_PREFERENCES_STORAGE_KEY } from '../../src/utils/localUiPreferences'

function PreferenceProbe() {
  const { hiddenSectionOpen, language, timeFormat, locale } = useLocalUiPreferences()
  return <output>{`${language}|${timeFormat}|${locale}|${hiddenSectionOpen}`}</output>
}

describe('LocalUiPreferencesProvider', () => {
  it('applies preferences changed in another browser tab', () => {
    render(
      <LocalUiPreferencesProvider>
        <PreferenceProbe />
      </LocalUiPreferencesProvider>,
    )

    const nextPreferences = JSON.stringify({
      theme: 'light',
      language: 'en-US',
      timeFormat: '12h',
      hiddenSectionOpen: false,
    })
    localStorage.setItem(LOCAL_UI_PREFERENCES_STORAGE_KEY, nextPreferences)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: LOCAL_UI_PREFERENCES_STORAGE_KEY,
          newValue: nextPreferences,
        }),
      )
    })

    expect(screen.getByText('en-US|12h|en-US|false')).toBeVisible()
  })
})
