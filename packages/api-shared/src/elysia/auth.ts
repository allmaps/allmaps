import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'

import { ResponseError } from '../shared/errors.js'
import { createElysia } from './app.js'
import { redirect } from './response.js'

function copySetCookieHeader(
  response: Response,
  set: { headers: Record<string, string | number> }
) {
  const cookies = response.headers.get('Set-Cookie')
  if (cookies) {
    set.headers['Set-Cookie'] = cookies
  }
}

export function createBetterAuthPlugin<TEnv = Record<string, unknown>>(
  betterAuth: BetterAuthContext
) {
  const { auth } = betterAuth

  return createElysia<TEnv>({ name: 'better-auth' })
    .macro({
      auth: {
        async resolve({ status, request: { headers } }) {
          const session = await auth.api.getSession({ headers })

          if (!session) {
            return status(401, { error: 'Unauthorized' })
          }

          return session
        }
      },
      admin: {
        async resolve({ status, request: { headers } }) {
          const session = await auth.api.getSession({ headers })

          if (!session || session.user.role !== 'admin') {
            return status(401, { error: 'Unauthorized' })
          }

          return session
        }
      }
    })
    .derive(({ request: { headers } }) => {
      return {
        getOptionalSession: async () => auth.api.getSession({ headers }),
        getSession: async () => {
          const session = await auth.api.getSession({ headers })

          if (!session) {
            throw new ResponseError('Unauthorized', 401)
          }

          return session
        }
      }
    })
}

export function createBetterAuthRoutes<TEnv = Record<string, unknown>>(
  betterAuth: BetterAuthContext
) {
  const { auth, baseURL } = betterAuth

  return createElysia<TEnv>({ name: 'better-auth-routes' })
    .mount(auth.handler)
    .get(
      '/login/github',
      async ({ set, query }) => {
        const callbackURL = query.returnTo ?? '/'

        const result = await auth.handler(
          new Request(`${baseURL}/auth/sign-in/social`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              provider: 'github',
              callbackURL
            })
          })
        )

        const data = (await result.json()) as { url?: string }
        copySetCookieHeader(result, set)

        if (data.url) {
          return redirect(data.url)
        }

        return { error: 'Failed to get GitHub OAuth URL' }
      },
      {
        query: t.Object({ returnTo: t.Optional(t.String()) }),
        detail: {
          summary: 'Login with GitHub',
          description:
            'Initiates GitHub OAuth flow and redirects to GitHub authorization page',
          tags: ['Authentication']
        }
      }
    )
    .get(
      '/logout',
      async ({ request, set, query }) => {
        const callbackURL = query.returnTo ?? '/'

        const signOutResult = await auth.handler(
          new Request(`${baseURL}/auth/sign-out`, {
            method: 'POST',
            headers: request.headers
          })
        )

        copySetCookieHeader(signOutResult, set)
        return redirect(callbackURL)
      },
      {
        query: t.Object({ returnTo: t.Optional(t.String()) }),
        detail: {
          summary: 'Logout',
          description:
            'Signs out and redirects to URL specified in returnTo query parameter',
          tags: ['Authentication']
        }
      }
    )
}
