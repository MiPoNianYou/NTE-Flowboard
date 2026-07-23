import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import i18n from './i18n'
import './index.css'
import App from './App'
import { DisplayPreferencesProvider } from './context/DisplayPreferencesContext'
import { ThemeProvider } from './context/ThemeContext'
import { getEffectiveLocale } from './i18n/displayPreferences'

const initialLocale = getEffectiveLocale()
document.documentElement.lang = initialLocale
document
  .querySelector('meta[name="description"]')
  ?.setAttribute('content', i18n.t('meta.description', { lng: initialLocale }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <DisplayPreferencesProvider>
        <App />
      </DisplayPreferencesProvider>
    </ThemeProvider>
  </StrictMode>,
)
