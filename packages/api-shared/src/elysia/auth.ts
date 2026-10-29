import { t } from 'elysia'
import { and, eq } from 'drizzle-orm'

import type { BetterAuthContext } from '@allmaps/db/auth'
import * as authSchema from '@allmaps/db/schema/auth'

import { ResponseError } from '../shared/errors.js'
import { createElysia } from './app.js'
import { setCacheControl } from './cache.js'
import { redirect } from './response.js'
import {
  isOrganizationPlan,
  ORGANIZATION_PLANS_WITH_ELEVATED_LIMITS
} from '../shared/tiers.js'

import type { UserRole } from '../shared/limits.js'

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
    .derive(({ db, request: { headers } }) => {
      const getOptionalSession = async () => auth.api.getSession({ headers })

      return {
        getOptionalSession,
        getLimitRole: async (): Promise<UserRole> => {
          const session = await getOptionalSession()

          return session?.user.role === 'admin'
            ? 'admin'
            : session?.user.id
              ? 'user'
              : 'public'
        },
        getSession: async () => {
          const session = await getOptionalSession()

          if (!session) {
            throw new ResponseError('Unauthorized', 401)
          }

          return session
        },
        getOrganizationLimitRole: async (organization: {
          id?: string
          slug?: string
        }): Promise<UserRole> => {
          const session = await getOptionalSession()

          if (session?.user.role === 'admin') {
            return 'admin'
          }

          if (!session?.user.id || (!organization.id && !organization.slug)) {
            return 'public'
          }

          const [membership] = await db
            .select({
              plan: authSchema.organizations.plan
            })
            .from(authSchema.members)
            .innerJoin(
              authSchema.organizations,
              eq(authSchema.members.organizationId, authSchema.organizations.id)
            )
            .where(
              and(
                eq(authSchema.members.userId, session.user.id),
                organization.id
                  ? eq(authSchema.organizations.id, organization.id)
                  : eq(authSchema.organizations.slug, organization.slug!)
              )
            )
            .limit(1)

          if (
            membership?.plan &&
            isOrganizationPlan(membership.plan) &&
            ORGANIZATION_PLANS_WITH_ELEVATED_LIMITS.has(membership.plan)
          ) {
            return 'organizationPlanMember'
          }

          return 'user'
        }
      }
    })
    .as('global')
}

export function createBetterAuthRoutes<TEnv = Record<string, unknown>>(
  betterAuth: BetterAuthContext
) {
  const { auth, baseURL } = betterAuth

  return createElysia<TEnv>({ name: 'better-auth-routes' })
    .mount(auth.handler)
    .get(
      '/login/:provider',
      async ({ set, query, params: { provider } }) => {
        setCacheControl(set, 'private-no-store')
        const providerName = provider === 'github' ? 'GitHub' : 'Google'
        if (!auth.options.socialProviders[provider])
          throw new ResponseError(
            `${providerName} login is not configured`,
            404
          )
        const callbackURL = query.returnTo ?? '/'
        const context = await auth.$context
        if (
          !context.isTrustedOrigin(callbackURL, { allowRelativePaths: true })
        ) {
          throw new ResponseError('Invalid return URL', 403)
        }

        const result = await auth.handler(
          new Request(`${baseURL}/auth/sign-in/social`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              provider,
              callbackURL
            })
          })
        )

        if (!result.ok) return result

        const data = (await result.json()) as { url?: string }

        if (data.url) {
          const response = redirect(data.url)
          for (const cookie of result.headers.getSetCookie()) {
            response.headers.append('Set-Cookie', cookie)
          }
          return response
        }

        throw new ResponseError(`Failed to get ${providerName} OAuth URL`, 502)
      },
      {
        params: t.Object({
          provider: t.Union([t.Literal('github'), t.Literal('google')])
        }),
        query: t.Object({ returnTo: t.Optional(t.String()) }),
        detail: {
          summary: 'Login with GitHub or Google',
          description:
            'Initiates OAuth flow and redirects to the configured provider authorization page',
          tags: ['Authentication']
        }
      }
    )
    .get(
      '/logout',
      async ({ request, set, query }) => {
        setCacheControl(set, 'private-no-store')
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

export function getLoginProviders(
  { auth }: BetterAuthContext,
  baseURL: string
) {
  return (['github', 'google'] as const)
    .filter((provider) => auth.options.socialProviders[provider])
    .map((provider) => ({
      provider,
      url: `${baseURL}/login/${provider}`
    }))
}
