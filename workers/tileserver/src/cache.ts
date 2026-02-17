const cache = caches.default

type Env = {
  BROWSER_CACHE_HOURS: number
  CLOUDFLARE_CACHE_HOURS: number
}

export async function match(url: string) {
  return await cache.match(url)
}

export async function headers(response: Response, request: Request, env: Env) {
  // Convert hours to seconds
  const browserCacheSeconds = env.BROWSER_CACHE_HOURS * 60 * 60
  const cloudflareCacheSeconds = env.CLOUDFLARE_CACHE_HOURS * 60 * 60

  // Set cache headers for both browser and CDN
  response.headers.set(
    'Cache-Control',
    `public, max-age=${browserCacheSeconds}, s-maxage=${cloudflareCacheSeconds}`
  )

  // Cloudflare-specific cache header for longer CDN caching
  response.headers.set('CDN-Cache-Control', `max-age=${cloudflareCacheSeconds}`)

  return response
}

export async function put(response: Response, request: Request) {
  // Only cache HTTP 200 responses
  if (response.status === 200) {
    await cache.put(request.url, response.clone())
  }

  return response
}
