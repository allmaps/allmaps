import { defineCustomClientStrategy, locales } from '$lib/paraglide/runtime.js'

function getValidLocale(locale: string | null) {
  if (locale && locales.includes(locale as (typeof locales)[number])) {
    return locale as (typeof locales)[number]
  }
}

export function defineQueryParamClientStrategy() {
  if (typeof window === 'undefined') {
    return
  }

  defineCustomClientStrategy('custom-queryParam', {
    getLocale: () => {
      const urlParams = new URLSearchParams(window.location.search)
      return getValidLocale(urlParams.get('lang'))
    },
    setLocale: (locale: string) => {
      const url = new URL(window.location.href)
      url.searchParams.set('lang', locale)
      window.history.replaceState({}, '', url.toString())
    }
  })
}
