// Map a BCP-47 speech-recognition language tag (like "en-US" or "yue-Hant-HK")
// onto one of the locale codes we ship translations for.
// Everything that doesn't match falls through to English.
export type SupportedI18nLocale
  = | 'zh-CN'
    | 'zh-TW'
    | 'en'
    | 'es'
    | 'fr'
    | 'de'
    | 'it'
    | 'pt'
    | 'ja'
    | 'ko'
    | 'ru'
    | 'nl'

const LOCALE_MAP: Record<string, SupportedI18nLocale> = {
  // Chinese script variants
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-TW',
  'yue': 'zh-TW', // Cantonese uses traditional characters
}

const SUPPORTED_PRIMARY_SUBTAGS = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'ru', 'nl',
])

export const speechLangToI18nLocale = (speechLang: string): SupportedI18nLocale => {
  // Exact-tag match first (handles zh-CN / zh-TW / zh-HK)
  if (LOCALE_MAP[speechLang]) return LOCALE_MAP[speechLang]

  const primary = speechLang.split('-')[0] ?? ''
  if (LOCALE_MAP[primary]) return LOCALE_MAP[primary]
  if (SUPPORTED_PRIMARY_SUBTAGS.has(primary)) return primary as SupportedI18nLocale

  return 'en'
}
