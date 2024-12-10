// TODO: move to env.
export const ONE_HOUR = 60 * 60

export function cachedFetch(
  url: string,
  requestInitr?: RequestInit | Request
): Promise<Response> {
  return fetch(url, {
    cf: { cacheTtl: ONE_HOUR, cacheEverything: true },
    ...requestInitr
  })
}
