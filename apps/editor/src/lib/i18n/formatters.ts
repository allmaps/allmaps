import { getCurrentLocale } from '$lib/i18n/locale.js'

type LocaleFormatters = {
  locale: string
  navDate: Intl.DateTimeFormat
  relativeTime: Intl.RelativeTimeFormat
}

let localeFormatters: LocaleFormatters | undefined

export function getLocaleFormatters() {
  const locale = getCurrentLocale()

  if (!localeFormatters || localeFormatters.locale !== locale) {
    localeFormatters = {
      locale,
      navDate: new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      relativeTime: new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto'
      })
    }
  }

  return localeFormatters
}
