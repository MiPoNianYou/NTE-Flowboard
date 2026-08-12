import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LocalUiPreferencesProvider } from '../../src/context/LocalUiPreferencesContext'
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext'
import {
  LOCAL_UI_PREFERENCES_STORAGE_KEY,
  LEGACY_THEME_PREFERENCE_STORAGE_KEY,
} from '../../src/utils/localUiPreferences'

function ThemeProbe() {
  const { effectiveTheme, setThemePreference, themePreference } = useTheme()
  return (
    <>
      <output data-testid="theme">{`${themePreference}:${effectiveTheme}`}</output>
      <button type="button" onClick={() => setThemePreference('light')}>
        light
      </button>
    </>
  )
}

function renderTheme() {
  return render(
    <LocalUiPreferencesProvider>
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    </LocalUiPreferencesProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.dataset.theme = 'dark'
})

describe('ThemeProvider', () => {
  it('updates the document and saved preference after a manual selection', () => {
    renderTheme()

    fireEvent.click(screen.getByRole('button', { name: 'light' }))

    expect(screen.getByTestId('theme')).toHaveTextContent('light:light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      theme: 'light',
    })
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
  })

  it('accepts an updated preference from another browser tab', async () => {
    renderTheme()

    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        theme: 'light',
        language: 'zh-CN',
        timeFormat: '24h',
        hiddenSectionOpen: true,
      }),
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_UI_PREFERENCES_STORAGE_KEY }))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('light:light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('migrates a legacy saved theme without losing display preferences', () => {
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'dark')
    localStorage.setItem(
      LOCAL_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ language: 'en-US', timeFormat: '12h' }),
    )

    renderTheme()

    expect(JSON.parse(localStorage.getItem(LOCAL_UI_PREFERENCES_STORAGE_KEY)!)).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '12h',
      hiddenSectionOpen: true,
    })
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
  })
})
