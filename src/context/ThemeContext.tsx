import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  getSystemTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_PREFERENCE_STORAGE_KEY,
  type EffectiveTheme,
  type ThemePreference,
} from '../theme/themePreferences'

interface ThemeContextValue {
  themePreference: ThemePreference
  effectiveTheme: EffectiveTheme
  setThemePreference: (preference: ThemePreference) => void
}

const THEME_COLORS: Record<EffectiveTheme, string> = {
  light: '#f4f6fb',
  dark: '#0d0d12',
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyDocumentTheme(theme: EffectiveTheme): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

function shouldUseThemeTransition(): boolean {
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState(readThemePreference)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)
  const effectiveTheme = resolveTheme(themePreference, systemTheme)

  useEffect(() => {
    applyDocumentTheme(effectiveTheme)
    saveThemePreference(themePreference)
  }, [effectiveTheme, themePreference])

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mediaQuery) return

    const handleChange = (event: MediaQueryListEvent) => {
      const nextSystemTheme: EffectiveTheme = event.matches ? 'dark' : 'light'
      setSystemTheme(nextSystemTheme)
      if (themePreference === 'system') applyDocumentTheme(nextSystemTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themePreference])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_PREFERENCE_STORAGE_KEY) return
      const nextPreference = readThemePreference()
      const nextTheme = resolveTheme(nextPreference, getSystemTheme())
      applyDocumentTheme(nextTheme)
      setThemePreferenceState(nextPreference)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setThemePreference = useCallback(
    (nextPreference: ThemePreference) => {
      if (nextPreference === themePreference) return

      const commit = () => {
        const nextTheme = resolveTheme(nextPreference, getSystemTheme())
        applyDocumentTheme(nextTheme)
        saveThemePreference(nextPreference)
        flushSync(() => setThemePreferenceState(nextPreference))
      }

      if (typeof document.startViewTransition === 'function' && shouldUseThemeTransition()) {
        document.startViewTransition(commit)
      } else {
        commit()
      }
    },
    [themePreference],
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
