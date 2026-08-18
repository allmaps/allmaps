import type { RequestEvent } from '@sveltejs/kit'

import { consoleEnv } from '$lib/server/console-env.js'

import type { ConsoleSessionData } from '$lib/types.js'

const sessionFetchTimeout = 10_000

export async function fetchConsoleSession(
  event: RequestEvent
): Promise<ConsoleSessionData> {
  const headers = new Headers()
  const cookie = event.request.headers.get('cookie')

  if (cookie) {
    headers.set('cookie', cookie)
  }

  const response = await event.fetch(
    `${consoleEnv.PUBLIC_REST_BASE_URL}/auth/get-session`,
    {
      credentials: 'include',
      headers,
      signal: AbortSignal.timeout(sessionFetchTimeout)
    }
  )

  return response.ok ? ((await response.json()) as ConsoleSessionData) : null
}
