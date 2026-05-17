import type { WorkerEnv } from '@allmaps/env/worker'
import type { FetchFn } from '@allmaps/types'

type RequestInitWithCf = RequestInit & {
  cf?: Record<string, unknown>
}

export function createCachedFetch(env: WorkerEnv): FetchFn {
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
