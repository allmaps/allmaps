import { t } from 'elysia'
import { and, eq } from 'drizzle-orm'

import type { BetterAuthContext } from '@allmaps/db/auth'
import * as authSchema from '@allmaps/db/schema/auth'

import { ResponseError } from '../shared/errors.js'
import { createElysia } from './app.js'
import { setCacheControl } from './cache.js'
import { redirect } from './response.js'
import { canImportIiif, getUserLimitRole } from '../shared/permissions.js'
import {
  isOrganizationPlan,
  ORGANIZATION_PLANS_WITH_ELEVATED_LIMITS
} from '../shared/tiers.js'

import type { UserRole } from '../shared/limits.js'

type OrganizationReference = {
  id?: string
  slug?: string
}

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
      importIiif: {
        async resolve({ status, request: { headers } }) {
          const session = await auth.api.getSession({
            headers,
            query: { disableCookieCache: true }
          })

          if (!session) {
            return status(401, { error: 'Unauthorized' })
          }

          if (!canImportIiif(session.user)) {
            return status(403, { error: 'Forbidden' })
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
      const getCurrentSession = async () =>
        auth.api.getSession({
          headers,
          query: { disableCookieCache: true }
        })

      const hasOrganizationPlanMembership = async (
        userId: string,
        organization: OrganizationReference
      ): Promise<boolean> => {
        if (!organization.id && !organization.slug) {
          return false
        }

        const [membership] = await db
          .select({ plan: authSchema.organizations.plan })
          .from(authSchema.members)
          .innerJoin(
            authSchema.organizations,
            eq(authSchema.members.organizationId, authSchema.organizations.id)
          )
          .where(
            and(
              eq(authSchema.members.userId, userId),
              organization.id
                ? eq(authSchema.organizations.id, organization.id)
                : eq(authSchema.organizations.slug, organization.slug!)
            )
          )
          .limit(1)

        return Boolean(
          membership?.plan &&
          isOrganizationPlan(membership.plan) &&
          ORGANIZATION_PLANS_WITH_ELEVATED_LIMITS.has(membership.plan)
        )
      }

      return {
        getOptionalSession,
        getLimitRole: async (): Promise<UserRole> => {
          const session = await getOptionalSession()
          return getUserLimitRole(session?.user)
        },
        getSession: async () => {
          const session = await getOptionalSession()

          if (!session) {
            throw new ResponseError('Unauthorized', 401)
          }

          return session
        },
        getOrganizationLimitRole: async (
          organization: OrganizationReference
        ): Promise<UserRole> => {
          const session = await getOptionalSession()
          const userRole = getUserLimitRole(session?.user)

          if (userRole === 'admin' || userRole === 'collaborator') {
            return userRole
          }

          if (!session?.user.id || (!organization.id && !organization.slug)) {
            return 'public'
          }

          return (await hasOrganizationPlanMembership(
            session.user.id,
            organization
          ))
            ? 'organizationPlanMember'
            : 'user'
        },
        canImportOrganizationIiif: async (
          organization: OrganizationReference
        ): Promise<boolean> => {
          const session = await getCurrentSession()

          if (!session) {
            return false
          }

          return (
            session.user.role === 'admin' ||
            (await hasOrganizationPlanMembership(session.user.id, organization))
          )
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
      '/login/github',
      async ({ set, query }) => {
        setCacheControl(set, 'private-no-store')
        if (!auth.options.socialProviders.github)
          throw new ResponseError('GitHub login is not configured', 404)
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
