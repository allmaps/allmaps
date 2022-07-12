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

    await cache.put(url, fetchResponse.clone())

    return fetchResponse
  } else {
    console.log('  Found in cache.')
    return cacheResponse
  }
}
