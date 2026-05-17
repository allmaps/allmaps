import type { FetchFn } from '@allmaps/types'

import type { Env } from './types.js'

type RequestInitWithCf = RequestInit & {
  cf?: Record<string, unknown>
}

export function createCachedFetch(env: Env): FetchFn {
  return (url, requestInit) => {
    if (!env.USE_CACHE) {
      return fetch(url, requestInit)
    }

    const cacheTtl = env.CLOUDFLARE_CACHE_HOURS * 60 * 60

    if (requestInit instanceof Request) {
      return fetch(url, {
        ...requestInit,
        cf: {
          cacheTtl,
          cacheEverything: true
        }
      })
    }

    const init = requestInit as RequestInitWithCf | undefined

    return fetch(url, {
      ...init,
      cf: {
        cacheTtl,
        cacheEverything: true,
        ...init?.cf
      }
    })
  }
}
