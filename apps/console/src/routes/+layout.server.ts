import { env as publicEnv } from '$env/dynamic/public'

import { parseConsolePublicEnv } from '@allmaps/env/console'

import type { LayoutServerLoad } from './$types'

const consoleEnv = parseConsolePublicEnv(publicEnv)
const sessionCacheTtlMs = 30_000
const maxSessionCacheEntries = 100

type SessionCacheEntry = {
  expiresAt: number
  session: unknown
}

const sessionCache = new Map<string, SessionCacheEntry>()

function getCachedSession(cookie: string | null) {
  if (!cookie) {
    return undefined
  }

  const cachedSession = sessionCache.get(cookie)
  if (!cachedSession) {
    return undefined
  }

  if (cachedSession.expiresAt < Date.now()) {
    sessionCache.delete(cookie)
    return undefined
  }

  return cachedSession.session
}

function setCachedSession(cookie: string | null, session: unknown) {
  if (!cookie) {
    return
  }

  if (sessionCache.size >= maxSessionCacheEntries) {
    const oldestKey = sessionCache.keys().next().value
    if (oldestKey) {
      sessionCache.delete(oldestKey)
    }
  }

  sessionCache.set(cookie, {
    expiresAt: Date.now() + sessionCacheTtlMs,
    session
  })
}

export const load: LayoutServerLoad = async ({ fetch, request }) => {
  const headers = new Headers()
  const cookie = request.headers.get('cookie')
  const cachedSession = getCachedSession(cookie)

  if (cookie) {
    headers.set('cookie', cookie)
  }

  if (cachedSession !== undefined) {
    return {
      env: consoleEnv,
      sessionData: {
        data: cachedSession
      }
    }
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

  setCachedSession(cookie, session)

  return {
    env: consoleEnv,
    sessionData: {
      data: session
    }
  }
}
