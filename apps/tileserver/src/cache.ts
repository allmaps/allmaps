import { ONE_HOUR } from './fetch.js'

const cache = caches.default

export async function match(url: string) {
  return await cache.match(url)
}

export async function headers(response: Response) {
  response.headers.append(
    'Cache-Control',
    ` public, immutable, no-transform, max-age=${12 * ONE_HOUR}`
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
