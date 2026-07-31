import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import i18n from '../i18n'
import {
  DISPLAY_PREFERENCES_STORAGE_KEY,
  readDisplayPreferences,
  updateDisplayPreferences,
  type DisplayPreferences,
  type LanguagePreference,
  type SupportedLocale,
  type TimeFormat,
} from '../i18n/displayPreferences'

interface DisplayPreferencesContextValue extends Pick<
  DisplayPreferences,
  'language' | 'timeFormat'
> {
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
  const locale = preferences.language

  const updatePreferences = useCallback((changes: Partial<DisplayPreferences>) => {
    const next = updateDisplayPreferences(changes)
    setPreferences(next)
  }, [])

  const setLanguage = useCallback(
    (language: LanguagePreference) => updatePreferences({ language }),
    [updatePreferences],
  )

  const setTimeFormat = useCallback(
    (timeFormat: TimeFormat) => updatePreferences({ timeFormat }),
    [updatePreferences],
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
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(
    () => ({
      language: preferences.language,
      timeFormat: preferences.timeFormat,
      locale,
      setLanguage,
      setTimeFormat,
    }),
    [locale, preferences.language, preferences.timeFormat, setLanguage, setTimeFormat],
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
