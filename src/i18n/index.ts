import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getEffectiveLocale } from './displayPreferences'
import { resources } from './resources'

void i18n.use(initReactI18next).init({
  resources,
  lng: getEffectiveLocale(),
  fallbackLng: 'zh-CN',
  supportedLngs: ['zh-CN', 'en-US'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  returnNull: false,
})

export default i18n
