import { defineCustomServerStrategy, locales } from '$lib/paraglide/runtime.js'

function getValidLocale(locale: string | null) {
  if (locale && locales.includes(locale as (typeof locales)[number])) {
    return locale as (typeof locales)[number]
  }
}

export function defineQueryParamServerStrategy() {
  defineCustomServerStrategy('custom-queryParam', {
    getLocale: (request: Request | undefined) => {
      if (!request) {
        return
      }

      const url = new URL(request.url)
      return getValidLocale(url.searchParams.get('lang'))
    }
  })
}
