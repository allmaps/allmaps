import type { Env } from './types.js'

const cache = caches.default

export async function match(url: string) {
  return await cache.match(url)
}

export async function headers(response: Response, request: Request, env: Env) {
  // Convert hours to seconds
  const browserCacheSeconds = env.BROWSER_CACHE_HOURS * 60 * 60
  const cloudflareCacheSeconds = env.CLOUDFLARE_CACHE_HOURS * 60 * 60

  // Cache images:
  // - Browsers: configured via BROWSER_CACHE_HOURS
  // - Cloudflare Edge: configured via CLOUDFLARE_CACHE_HOURS
  // This allows browsers to cache longer while CDN refreshes more frequently
  response.headers.append(
    'Cache-Control',
    `public, immutable, no-transform, max-age=${browserCacheSeconds}, s-maxage=${cloudflareCacheSeconds}`
  )

  return response
}

export async function put(response: Response, request: Request) {
  // Only cache HTTP 200 responses
  if (response.status === 200) {
    await cache.put(request.url, response.clone())
  }

  return response
}
