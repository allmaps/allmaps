import { vi } from 'vitest'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

export function sessionForRole(role: string) {
  return {
    user: { id: 'user-id', role, slug: 'collaborator' },
    session: { id: 'session-id' }
  }
}

export function createTestAuth(
  session: ReturnType<typeof sessionForRole> | null,
  currentSession = session
) {
  const getSession = vi.fn(
    async (options: { query?: { disableCookieCache?: boolean } }) =>
      options.query?.disableCookieCache ? currentSession : session
  )

  return {
    getSession,
    betterAuth: {
      auth: { api: { getSession } }
    } as unknown as BetterAuthContext
  }
}

export function createMembershipDb(plan: string | null = null) {
  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(async () => (plan === null ? [] : [{ plan }])),
    images: {
      findMany: vi.fn(async (_options: { limit: number }) => [] as unknown[])
    }
  }
  return { select: vi.fn(() => query), query }
}

export const env = {
  PUBLIC_REST_BASE_URL: 'https://api.example',
  PUBLIC_ANNOTATIONS_BASE_URL: 'https://annotations.example',
  PUBLIC_LIVE_BASE_URL: 'https://live.example'
} as RestEnv

export function request(path: string, body?: unknown, method = 'POST') {
  return new Request(`http://localhost${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
  })
}
