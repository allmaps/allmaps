import type { Handle } from '@sveltejs/kit'

import { paraglideMiddleware } from '$lib/paraglide/server.js'
import { getTextDirection } from '$lib/paraglide/runtime.js'
import { defineQueryParamServerStrategy } from '$lib/i18n/query-param-strategy.server.js'

defineQueryParamServerStrategy()

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
