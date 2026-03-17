import { t } from 'elysia'

import { auth, baseURL } from '@allmaps/db/auth'

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

export function createBetterAuthPlugin<TEnv = Record<string, unknown>>() {
  return createElysia<TEnv>({ name: 'better-auth' })
    .mount(auth.handler)
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
        getSession: async () => {
          const session = await auth.api.getSession({ headers })

          if (!session) {
            throw new ResponseError('Unauthorized', 401)
          }

          return session
        }
      }
    })
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
          summary: 'Login with GitHub (GET)',
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
          description: 'Signs out and redirects to returnTo or root',
          tags: ['Authentication']
        }
      }
    )
    .get(
      '/user',
      async ({ request, set }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          const anonResult = await auth.handler(
            new Request(`${baseURL}/auth/sign-in/anonymous`, {
              method: 'POST',
              headers: request.headers
            })
          )

          copySetCookieHeader(anonResult, set)

          const anonData = (await anonResult.json()) as {
            user?: unknown
            token?: string
          }

          if (anonData.user) {
            return {
              user: anonData.user,
              token: anonData.token,
              isAnonymous: true
            }
          }

          set.status = 500
          return { error: 'Failed to create anonymous session' }
        }

        return {
          user: session.user,
          session: {
            id: session.session.id,
            expiresAt: session.session.expiresAt,
            createdAt: session.session.createdAt
          },
          isAnonymous: session.user.isAnonymous || false
        }
      },
      {
        detail: {
          summary: 'Get current user',
          description:
            'Returns the currently authenticated user and session information',
          tags: ['Authentication']
        }
      }
    )
}
