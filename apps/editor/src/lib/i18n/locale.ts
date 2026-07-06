import { getLocale, locales } from '$lib/paraglide/runtime.js'

export function getCurrentLocale() {
  return getLocale()
}

export function getLanguagePreferences() {
  const locale = getCurrentLocale()
  const baseLocale = locales[0]

  return [locale, baseLocale].filter(
    (value, index, values) => values.indexOf(value) === index
  )
}
