import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from '../../context/ThemeContext'
import { THEME_PREFERENCE_STORAGE_KEY } from '../../theme/themePreferences'

type MatchMediaHarness = {
  setSystemTheme: (theme: 'light' | 'dark') => void
}

function installMatchMedia(initialTheme: 'light' | 'dark'): MatchMediaHarness {
  let isDark = initialTheme === 'dark'
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return isDark
      },
      media: '(prefers-color-scheme: dark)',
      addEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener)
      },
    })),
  )

  return {
    setSystemTheme(theme) {
      isDark = theme === 'dark'
      const event = {
        matches: isDark,
        media: '(prefers-color-scheme: dark)',
      } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
}

function ThemeProbe() {
  const { effectiveTheme, setThemePreference, themePreference } = useTheme()
  return (
    <>
      <output data-testid="theme">{`${themePreference}:${effectiveTheme}`}</output>
      <button type="button" onClick={() => setThemePreference('light')}>
        light
      </button>
      <button type="button" onClick={() => setThemePreference('system')}>
        system
      </button>
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.dataset.theme = 'light'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThemeProvider', () => {
  it('updates the document and saved preference after a manual selection', () => {
    installMatchMedia('dark')
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'light' }))

    expect(screen.getByTestId('theme')).toHaveTextContent('light:light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe('light')
  })

  it('updates immediately when the system appearance changes in system mode', async () => {
    const media = installMatchMedia('light')
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    media.setSystemTheme('dark')

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('system:dark'))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('accepts an updated preference from another browser tab', async () => {
    installMatchMedia('dark')
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'light')
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_PREFERENCE_STORAGE_KEY }))

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('light:light'))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
