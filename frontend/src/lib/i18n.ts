import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files directly
import enTranslation from '../../public/locales/en/translation.json'
import viTranslation from '../../public/locales/vi/translation.json'
import zhTranslation from '../../public/locales/zh/translation.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi', 'zh'],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Normalize e.g. zh-CN -> zh so Chinese browsers get the zh locale by default
      convertDetectedLanguage: (lng) => lng.split('-')[0],
    },
    resources: {
      en: {
        translation: enTranslation,
      },
      vi: {
        translation: viTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
    },
  })

export default i18n
