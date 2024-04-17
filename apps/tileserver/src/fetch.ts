const ONE_HOUR = 60 * 60

export function cachedFetch(
  request: string,
  requestInitr?: RequestInit | Request
) {
  // TODO: not all requests are currently correctly cached.
  return fetch(request as string, {
    cf: { cacheTtl: ONE_HOUR, cacheEverything: true },
    ...requestInitr
  })
}
