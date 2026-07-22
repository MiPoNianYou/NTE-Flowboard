import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import i18n from '../i18n'
import {
  DISPLAY_PREFERENCES_STORAGE_KEY,
  readDisplayPreferences,
  resolveLocale,
  saveDisplayPreferences,
  type DisplayPreferences,
  type LanguagePreference,
  type SupportedLocale,
  type TimeFormat,
} from '../i18n/displayPreferences'

interface DisplayPreferencesContextValue extends DisplayPreferences {
  locale: SupportedLocale
  setLanguage: (language: LanguagePreference) => void
  setTimeFormat: (timeFormat: TimeFormat) => void
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue | null>(null)

function applyDocumentLocale(locale: SupportedLocale): void {
  document.documentElement.lang = locale
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description', { lng: locale }))
}

export function DisplayPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(readDisplayPreferences)
  const locale = resolveLocale(preferences.language)

  const updatePreferences = useCallback((next: DisplayPreferences) => {
    setPreferences(next)
    saveDisplayPreferences(next)
  }, [])

  const setLanguage = useCallback(
    (language: LanguagePreference) => updatePreferences({ ...preferences, language }),
    [preferences, updatePreferences],
  )

  const setTimeFormat = useCallback(
    (timeFormat: TimeFormat) => updatePreferences({ ...preferences, timeFormat }),
    [preferences, updatePreferences],
  )

  useEffect(() => {
    void i18n.changeLanguage(locale)
    applyDocumentLocale(locale)
  }, [locale])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DISPLAY_PREFERENCES_STORAGE_KEY) return
      setPreferences(readDisplayPreferences())
    }
    const handleLanguageChange = () => {
      if (preferences.language === 'system') setPreferences(readDisplayPreferences())
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('languagechange', handleLanguageChange)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('languagechange', handleLanguageChange)
    }
  }, [preferences.language])

  const value = useMemo(
    () => ({ ...preferences, locale, setLanguage, setTimeFormat }),
    [locale, preferences, setLanguage, setTimeFormat],
  )

  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  )
}

export function useDisplayPreferences(): DisplayPreferencesContextValue {
  const context = useContext(DisplayPreferencesContext)
  if (!context) {
    throw new Error('useDisplayPreferences must be used within DisplayPreferencesProvider')
  }
  return context
}
