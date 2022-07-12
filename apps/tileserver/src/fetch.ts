import type { Cache } from './types.js'

export async function cachedFetch(
  cache: Cache,
  url: string
) {
  console.log('Fetching:', url)
  const cacheResponse = await cache.match(url)

  if (!cacheResponse) {
    console.log('  Not found in cache. Downloading.')
    const fetchResponse = await fetch(url)

    if (fetchResponse.status !== 200) {
      throw new Error(`Failed to fetch ${url}`)
    }

    const response = fetchResponse.clone()

    // TODO: read ttl from config
    const ttlSeconds = 5 * 60
    response.headers.append('Cache-Control', `s-maxage=${ttlSeconds}`)
    // TODO: do we need to do response.clone()?
    await cache.put(url, response)

    return fetchResponse
  } else {
    console.log('  Found in cache.')
    return cacheResponse
  }
}
