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
  await cache.put(request.url, response.clone())
  return response
}
