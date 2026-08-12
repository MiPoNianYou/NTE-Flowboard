import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useLocalUiPreferences } from './LocalUiPreferencesContext'
import type { ThemePreference } from '../types'

interface ThemeContextValue {
  themePreference: ThemePreference
  effectiveTheme: ThemePreference
  setThemePreference: (preference: ThemePreference) => void
}

const THEME_COLORS: Record<ThemePreference, string> = {
  light: '#f4f6fb',
  dark: '#0d0d12',
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyDocumentTheme(theme: ThemePreference): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

function shouldUseThemeTransition(): boolean {
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function hasHoveredScaleCard(): boolean {
  return Boolean(document.querySelector('[data-hover-scale-card]:hover'))
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: themePreference, setTheme } = useLocalUiPreferences()
  const effectiveTheme = themePreference

  useEffect(() => {
    applyDocumentTheme(effectiveTheme)
  }, [effectiveTheme])

  const setThemePreference = useCallback(
    (nextPreference: ThemePreference) => {
      if (nextPreference === themePreference) return

      const commit = () => {
        applyDocumentTheme(nextPreference)
        flushSync(() => setTheme(nextPreference))
      }

      if (
        typeof document.startViewTransition === 'function' &&
        shouldUseThemeTransition() &&
        !hasHoveredScaleCard()
      ) {
        document.startViewTransition(commit)
      } else {
        commit()
      }
    },
    [setTheme, themePreference],
  )

  const value = useMemo(
    () => ({ themePreference, effectiveTheme, setThemePreference }),
    [effectiveTheme, setThemePreference, themePreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
