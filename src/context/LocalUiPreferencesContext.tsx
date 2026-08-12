import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import i18n from '../i18n'
import {
  LOCAL_UI_PREFERENCES_STORAGE_KEY,
  readLocalUiPreferences,
  updateLocalUiPreferences,
} from '../utils/localUiPreferences'
import type {
  LanguagePreference,
  LocalUiPreferences,
  SupportedLocale,
  ThemePreference,
  TimeFormat,
} from '../types'

interface LocalUiPreferencesContextValue extends LocalUiPreferences {
  locale: SupportedLocale
  setTheme: (theme: ThemePreference) => void
  setLanguage: (language: LanguagePreference) => void
  setTimeFormat: (timeFormat: TimeFormat) => void
  setHiddenSectionOpen: (open: boolean) => void
}

const LocalUiPreferencesContext = createContext<LocalUiPreferencesContextValue | null>(null)

function applyDocumentLocale(locale: SupportedLocale): void {
  document.documentElement.lang = locale
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description', { lng: locale }))
}

export function LocalUiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(readLocalUiPreferences)
  const locale = preferences.language

  const updatePreferences = useCallback((changes: Partial<LocalUiPreferences>) => {
    const next = updateLocalUiPreferences(changes)
    setPreferences(next)
  }, [])

  const setTheme = useCallback(
    (theme: ThemePreference) => updatePreferences({ theme }),
    [updatePreferences],
  )

  const setLanguage = useCallback(
    (language: LanguagePreference) => updatePreferences({ language }),
    [updatePreferences],
  )

  const setTimeFormat = useCallback(
    (timeFormat: TimeFormat) => updatePreferences({ timeFormat }),
    [updatePreferences],
  )

  const setHiddenSectionOpen = useCallback(
    (hiddenSectionOpen: boolean) => updatePreferences({ hiddenSectionOpen }),
    [updatePreferences],
  )

  useEffect(() => {
    void i18n.changeLanguage(locale)
    applyDocumentLocale(locale)
  }, [locale])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_UI_PREFERENCES_STORAGE_KEY) return
      setPreferences(readLocalUiPreferences())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(
    () => ({
      ...preferences,
      locale,
      setTheme,
      setLanguage,
      setTimeFormat,
      setHiddenSectionOpen,
    }),
    [locale, preferences, setHiddenSectionOpen, setLanguage, setTheme, setTimeFormat],
  )

  return (
    <LocalUiPreferencesContext.Provider value={value}>
      {children}
    </LocalUiPreferencesContext.Provider>
  )
}

export function useLocalUiPreferences(): LocalUiPreferencesContextValue {
  const context = useContext(LocalUiPreferencesContext)
  if (!context) {
    throw new Error('useLocalUiPreferences must be used within LocalUiPreferencesProvider')
  }
  return context
}
