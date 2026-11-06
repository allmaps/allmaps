import { Elysia, ElysiaCustomStatusResponse } from 'elysia'

import { setCacheControl } from './cache.js'

const privateCacheControl = 'private, no-store'

/** Apply final response safeguards after a route has selected its public TTL. */
export function applyCachePolicy(
  request: Request,
  status: number,
  headers: Headers
) {
  // Anonymous and credential-bearing representations must never share a key.
  const vary = new Set(
    (headers.get('Vary') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
  for (const name of ['origin', 'cookie', 'authorization']) vary.add(name)
  headers.set('Vary', [...vary].join(', '))

  const pathname = new URL(request.url).pathname
  const isAuthRoute =
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/logout'

  if (
    !['GET', 'HEAD'].includes(request.method) ||
    status < 200 ||
    status >= 300 ||
    request.headers.has('Cookie') ||
    request.headers.has('Authorization') ||
    headers.has('Set-Cookie') ||
    isAuthRoute ||
    !headers.has('Cache-Control')
  ) {
    headers.set('Cache-Control', privateCacheControl)
  }
}

export function createCachePolicy() {
  return new Elysia({ name: 'api-cache-policy' })
    .onRequest(({ set }) => {
      // Defaults also cover validation failures, auth guards and unknown routes.
      setCacheControl(set, 'private-no-store')
      set.headers.Vary = 'Origin, Cookie, Authorization'
    })
    .onAfterHandle(({ request, response, set }) => {
      const headers = new Headers(
        Object.entries(set.headers).map(([name, value]) => [
          name,
          String(value)
        ])
      )
      if (response instanceof Response) {
        for (const [name, value] of response.headers) headers.set(name, value)
        // Preserve multiple cookies rather than folding them into one value.
        if (response.headers.has('Set-Cookie')) {
          headers.delete('Set-Cookie')
          for (const cookie of response.headers.getSetCookie()) {
            headers.append('Set-Cookie', cookie)
          }
        }
      }
      const status =
        response instanceof Response
          ? response.status
          : response instanceof ElysiaCustomStatusResponse
            ? response.code
            : typeof set.status === 'number'
              ? set.status
              : 200
      applyCachePolicy(request, status, headers)
      set.headers['Cache-Control'] = headers.get('Cache-Control')!
      set.headers.Vary = headers.get('Vary')!

      if (response instanceof Response) {
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        })
      }
    })
    .onError(({ set }) => {
      // A handler may have selected a public TTL before its query threw.
      setCacheControl(set, 'private-no-store')
    })
    .as('global')
}
