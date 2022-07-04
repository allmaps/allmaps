import type { Cache } from './types.js'

export async function cachedFetch(
  cache: Cache,
  // context: ExecutionContext,
  url: string
) {
  // const cacheUrl = new URL(request.url)
  // const cacheKey = new Request(cacheUrl.toString(), request)

  console.log('Fetching:', url)
  const cacheResponse = await cache.match(url)

  if (!cacheResponse) {
    console.log('  Not found in cache. Downloading.')
    const fetchResponse = await fetch(url)

    if (fetchResponse.status !== 200) {
      throw new Error(`Failed to fetch ${url}`)
    }

    // TODO: ttl from config
    // fetchResponse.headers.append('Cache-Control', 's-maxage=120')
    // context.waitUntil(cache.put(url, fetchResponse.clone()))
    cache.put(url, fetchResponse.clone())

    return fetchResponse
  } else {
    console.log('  Found in cache.')
    return cacheResponse
  }
}
