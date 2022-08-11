import type { Cache } from './types.js'

export async function cachedFetch(cache: Cache, url: string) {
  console.log('Fetching:', url)
  const cacheResponse = await cache.match(url)

  if (!cacheResponse) {
    console.log('  Not found in cache. Downloading.')
    const fetchResponse = await fetch(url)

    if (fetchResponse.status !== 200) {
      throw new Error(`Failed to fetch ${url}`)
    }

    // Clone the response so that it's no longer immutable
    // https://developers.cloudflare.com/workers/examples/alter-headers
    const cacheResponse = new Response(fetchResponse.body, fetchResponse)

    // Remove cookie headers to ensure response is cached
    // https://developers.cloudflare.com/workers/runtime-apis/cache/#headers
    cacheResponse.headers.delete('set-cookie')

    // It seems responses without last-modified headers are not cached...
    // If this header is not present, add one, with a date 1 hour in the past
    if (!cacheResponse.headers.has('last-modified')) {
      const now = new Date()
      now.setMinutes(now.getMinutes() - 60)

      cacheResponse.headers.set('last-modified', now.toUTCString())
    }

    await cache.put(url, cacheResponse)

    return fetchResponse
  } else {
    console.log('  Found in cache.')

    return cacheResponse
  }
}
