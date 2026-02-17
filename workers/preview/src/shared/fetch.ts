// TODO: move to env.
export const ONE_HOUR = 60 * 60
export const ONE_DAY = 24 * 60 * 60
export const ONE_WEEK = 7 * 24 * 60 * 60
export const ONE_MONTH = 30 * 24 * 60 * 60

export function cachedFetch(
  url: string,
  requestInit?: RequestInit | Request
): Promise<Response> {
  return fetch(url, {
    cf: { cacheTtl: ONE_HOUR, cacheEverything: true },
    ...requestInit
  })
}
