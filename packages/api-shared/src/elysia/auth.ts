import { t } from 'elysia'
import { and, eq } from 'drizzle-orm'

import type { BetterAuthContext } from '@allmaps/db/auth'
import * as authSchema from '@allmaps/db/schema/auth'

import { ResponseError } from '../shared/errors.js'
import { createElysia } from './app.js'
import { setCacheControl } from './cache.js'
import { redirect } from './response.js'
import {
  canImportIiif,
  isSignedInUser,
  isOrganizationManager,
  getUserLimitRole,
  getOrganizationPermissions
} from '../shared/permissions.js'
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
    .derive({ as: 'global' }, ({ db, request: { headers } }) => {
      const readSession = (disableCookieCache = false) =>
        auth.api.getSession({ headers, query: { disableCookieCache } })
      let cachedSession: ReturnType<typeof readSession> | undefined
      let currentSession: ReturnType<typeof readSession> | undefined

      // Share reads within this request only. A fresh result takes precedence
      // over cookie cache, including when the session has been revoked.
      const getOptionalSession = () =>
        currentSession ?? (cachedSession ??= readSession())
      const getCurrentSession = async () => {
        const session = await (currentSession ??= readSession(true))
        return isSignedInUser(session?.user) ? session : null
      }

      const hasOrganizationPlanMembership = async (
        userId: string,
        organization: OrganizationReference,
        ownerOnly = false
      ): Promise<boolean> => {
        if (!organization.id && !organization.slug) {
          return false
        }

        const [membership] = await db
          .select({
            plan: authSchema.organizations.plan,
            role: authSchema.members.role
          })
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
          (!ownerOnly || membership?.role === 'owner') &&
          membership?.plan &&
          isOrganizationPlan(membership.plan) &&
          ORGANIZATION_PLANS_WITH_ELEVATED_LIMITS.has(membership.plan)
        )
      }

      return {
        getOptionalSession,
        getCurrentSession,
        getOrganizationAccess: async (organizationId: string) => {
          const session = await getCurrentSession()
          const member =
            session?.user.id && !isOrganizationManager(session.user.role)
              ? await db.query.members.findFirst({
                  columns: { role: true },
                  where: {
                    organizationId: { eq: organizationId },
                    userId: { eq: session.user.id }
                  }
                })
              : undefined

          return {
            session,
            permissions: getOrganizationPermissions(
              session?.user.role,
              member?.role
            )
          }
        },
        getLimitRole: async (): Promise<UserRole> => {
          const session = await getOptionalSession()
          return getUserLimitRole(session?.user)
        },
        getOrganizationLimitRole: async (
          organization: OrganizationReference
        ): Promise<UserRole> => {
          const session = await getOptionalSession()
          const userRole = getUserLimitRole(session?.user)

          if (userRole === 'admin' || userRole === 'collaborator') {
            return userRole
          }

          if (
            !session ||
            !isSignedInUser(session.user) ||
            (!organization.id && !organization.slug)
          ) {
            return 'public'
          }

          return (await hasOrganizationPlanMembership(
            session.user.id,
            organization
          ))
            ? 'organizationPlanMember'
            : 'user'
        },
        getOrganizationIiifImportAccess: async (
          organization: OrganizationReference
        ) => {
          const session = await getCurrentSession()

          const unrestricted = canImportIiif(session?.user)
          return {
            canImport:
              unrestricted ||
              Boolean(
                session &&
                (await hasOrganizationPlanMembership(
                  session.user.id,
                  organization,
                  true
                ))
              ),
            restrictDomains: !unrestricted
          }
        }
      }
    })
    .macro({
      auth: {
        async resolve({ getCurrentSession, status }) {
          const session = await getCurrentSession()
          if (!session) return status(401, { error: 'Unauthorized' })
          return session
        }
      }
    })
    .macro('organizationManager', {
      auth: true,
      beforeHandle({ user, status }) {
        if (!isOrganizationManager(user.role)) {
          return status(403, { error: 'Forbidden' })
        }
      }
    })
    .macro('importIiif', { organizationManager: true })
    .macro('admin', {
      auth: true,
      beforeHandle({ user, status }) {
        if (user.role !== 'admin') {
          return status(401, { error: 'Unauthorized' })
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

        // Keep Better Auth's callback URL validation for OAuth redirects.
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

        // GET links may have no Origin or Referer; use the server API.
        const signOutResult = await auth.api.signOut({
          headers: request.headers,
          asResponse: true
        })
        if (!signOutResult.ok) return signOutResult

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
