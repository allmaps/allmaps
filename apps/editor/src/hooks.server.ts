import type { Handle, HandleFetch } from '@sveltejs/kit'

import { paraglideMiddleware } from '$lib/paraglide/server.js'
import { getTextDirection } from '$lib/paraglide/runtime.js'
import { defineQueryParamServerStrategy } from '$lib/i18n/query-param-strategy.server.js'

defineQueryParamServerStrategy()

export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
  const requestUrl = new URL(request.url)
  if (
    requestUrl.origin !== event.url.origin &&
    (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:')
  ) {
    const headers = new Headers(request.headers)
    headers.set('User-Agent', 'Allmaps Editor (+https://editor.allmaps.org/)')
    request = new Request(request, { headers })
  }

  return fetch(request)
}

export const handle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(
    event.request,
    ({ request: localizedRequest, locale }) => {
      event.request = localizedRequest

      return resolve(event, {
        transformPageChunk: ({ html }) =>
          html
            .replace('%lang%', locale)
            .replace('%dir%', getTextDirection(locale))
      })
    }
  )
