import { env as publicEnv } from '$env/dynamic/public'

import { parseConsolePublicEnv } from '@allmaps/env/console'

import type { LayoutServerLoad } from './$types'

const consoleEnv = parseConsolePublicEnv(publicEnv)

export const load: LayoutServerLoad = async ({ fetch, request }) => {
  const headers = new Headers()
  const cookie = request.headers.get('cookie')

  if (cookie) {
    headers.set('cookie', cookie)
  }

  const response = await fetch(
    `${consoleEnv.PUBLIC_REST_BASE_URL}/auth/get-session`,
    {
      credentials: 'include',
      headers,
      signal: AbortSignal.timeout(10_000)
    }
  )
  const session = response.ok ? await response.json() : null

  return {
    env: consoleEnv,
    sessionData: {
      data: session
    }
  }
}
