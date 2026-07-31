import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext'
import {
  DISPLAY_PREFERENCES_STORAGE_KEY,
  LEGACY_THEME_PREFERENCE_STORAGE_KEY,
} from '../../src/i18n/displayPreferences'

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

beforeEach(() => {
  localStorage.clear()
  document.documentElement.dataset.theme = 'dark'
})

describe('ThemeProvider', () => {
  it('updates the document and saved preference after a manual selection', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'light' }))

    expect(screen.getByTestId('theme')).toHaveTextContent('light:light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      theme: 'light',
    })
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
  })

  it('accepts an updated preference from another browser tab', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'light', language: 'zh-CN', timeFormat: '24h' }),
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: DISPLAY_PREFERENCES_STORAGE_KEY }))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('light:light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('migrates a legacy saved theme without losing display preferences', () => {
    localStorage.setItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY, 'dark')
    localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ language: 'en-US', timeFormat: '12h' }),
    )

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)!)).toEqual({
      theme: 'dark',
      language: 'en-US',
      timeFormat: '12h',
    })
    expect(localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY)).toBeNull()
  })
})
