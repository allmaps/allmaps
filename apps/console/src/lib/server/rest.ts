import { getRequestEvent } from '$app/server'
import { env as publicEnv } from '$env/dynamic/public'

import { parseConsolePublicEnv } from '@allmaps/env/console'

const consoleEnv = parseConsolePublicEnv(publicEnv)
const restFetchTimeout = 10_000

type RestFetchOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | null
  json?: unknown
}

export async function restFetch<T>(
  path: string,
  options: RestFetchOptions = {}
): Promise<T> {
  const event = getRequestEvent()
  const headers = new Headers(options.headers)
  const cookie = event.request.headers.get('cookie')

  if (cookie) {
    headers.set('cookie', cookie)
  }

  if (options.json !== undefined) {
    headers.set('content-type', 'application/json')
  }

  const response = await event.fetch(
    `${consoleEnv.PUBLIC_REST_BASE_URL}${path}`,
    {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(restFetchTimeout),
      body:
        options.json === undefined ? options.body : JSON.stringify(options.json)
    }
  )

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(responseText || `REST request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
