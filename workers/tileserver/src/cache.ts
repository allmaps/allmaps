import { ONE_HOUR } from './fetch.js'

const cache = caches.default

// Cache durations
const BROWSER_CACHE_MAX_AGE = 1 * ONE_HOUR // 1 hour for browsers
const CDN_CACHE_MAX_AGE = 24 * ONE_HOUR // 24 hours for Cloudflare CDN

export async function match(url: string) {
  return await cache.match(url)
}

export async function headers(response: Response) {
  // Set cache headers for both browser and CDN
  response.headers.set(
    'Cache-Control',
    `public, max-age=${BROWSER_CACHE_MAX_AGE}, s-maxage=${CDN_CACHE_MAX_AGE}`
  )

  // Cloudflare-specific cache header for longer CDN caching
  response.headers.set('CDN-Cache-Control', `max-age=${CDN_CACHE_MAX_AGE}`)

  return response
}

export async function put(response: Response, request: Request) {
  // Only cache HTTP 200 responses
  if (response.status === 200) {
    await cache.put(request.url, response.clone())
  }

  return response
}
