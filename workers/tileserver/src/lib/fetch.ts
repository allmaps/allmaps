import type { WorkerEnv } from '@allmaps/env/worker'
import type { FetchFn } from '@allmaps/types'

type RequestInitWithCf = RequestInit & {
  cf?: Record<string, unknown>
}

export function createCachedFetch(env: WorkerEnv): FetchFn {
  return async (url, requestInit) => {
    let init = requestInit as RequestInitWithCf | undefined

    if (env.USE_CACHE) {
      const cf: Record<string, unknown> = { ...init?.cf }
      // A blanket TTL would also cache upstream errors. Keep this policy last
      // so caller options cannot accidentally re-enable caching for failures.
      delete cf.cacheTtl
      init = {
        ...init,
        cf: {
          ...cf,
          cacheEverything: true,
          cacheTtlByStatus: {
            '200-299': env.CLOUDFLARE_CACHE_HOURS * 60 * 60,
            '300-599': -1
          }
        }
      }
    }

    const response = await fetch(url, init)

    if (!response.ok) {
      const upstreamUrl = new URL(url instanceof Request ? url.url : url)
      console.warn('Upstream request failed', {
        url: `${upstreamUrl.origin}${upstreamUrl.pathname}`,
        status: response.status,
        retryAfter: response.headers.get('Retry-After'),
        age: response.headers.get('Age'),
        cfCacheStatus: response.headers.get('CF-Cache-Status')
      })
    }

    return response
  }
}
