import type { FetchFn } from '@allmaps/types'

import type { Env } from './types.js'

type RequestInitWithCf = RequestInit & {
  cf?: Record<string, unknown>
}

export function createCachedFetch(env: Env): FetchFn {
  return (url, requestInit) => {
    const init = requestInit as RequestInitWithCf | undefined
    const headers = new Headers(
      init?.headers ?? (url instanceof Request ? url.headers : undefined)
    )
    headers.set('User-Agent', 'Allmaps Preview (+https://preview.allmaps.org/)')

    if (!env.USE_CACHE) {
      return fetch(url, { ...init, headers })
    }

    const cf: Record<string, unknown> = { ...init?.cf }
    // Do not cache failed source requests, even if the caller supplies a TTL.
    delete cf.cacheTtl

    return fetch(url, {
      ...init,
      headers,
      cf: {
        ...cf,
        cacheEverything: true,
        cacheTtlByStatus: {
          '200-299': env.CLOUDFLARE_CACHE_HOURS * 60 * 60,
          '300-599': -1
        }
      }
    })
  }
}
