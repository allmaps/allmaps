import { t } from 'elysia'

import { setCacheControl, isOrganizationManager } from '@allmaps/api-shared'
import type { BetterAuthContext } from '@allmaps/db/auth'
import { createAuth } from '@allmaps/db/auth'
import { createElysia, createBetterAuthPlugin, error } from '../elysia.js'
import {
  adminDetail,
  organizationManagerDetail,
  organizationOwnerDetail
} from '../openapi.js'
import {
  queryAdminOrganizationById,
  queryUserWithOrganizationsById,
  changeOrganizationMember,
  queryOrganizationMembersById,
  queryUserByEmail,
  queryUsers,
  setUserRole
} from '@allmaps/api-shared/db'
import type { RestEnv } from '@allmaps/env/rest'

const Role = t.Union([t.Literal('owner'), t.Literal('member')])

export function createAuthRoutes(
  env: RestEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  const { auth } = betterAuth

  return createElysia({
    name: 'auth-routes'
  })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/users',
      async ({ db, env, query, set, getLimitRole }) => {
        setCacheControl(set, 'private-no-store')
        return queryUsers(
          db,
          env.PUBLIC_REST_BASE_URL,
          query.limit,
          true,
          await getLimitRole()
        )
      },
      {
        organizationManager: true,
        query: t.Object({ limit: t.Optional(t.Number()) }),
        detail: {
          summary: 'Get all users',
          tags: ['Authentication'],
          ...organizationManagerDetail
        }
      }
    )
    .get(
      '/users/:userId',
      async ({ db, env, params, getCurrentSession, set, status }) => {
        const session = await getCurrentSession()

        if (
          !session ||
          (!isOrganizationManager(session.user.role) &&
            session.user.id !== params.userId)
        ) {
          return status(401, { error: 'Unauthorized' })
        }

        setCacheControl(set, 'private-no-store')
        const user = await queryUserWithOrganizationsById(
          db,
          env.PUBLIC_REST_BASE_URL,
          params.userId
        )

        if (!user) {
          error(404, `User not found: ${params.userId}`)
        }

        return user
      },
      {
        params: t.Object({ userId: t.String() }),
        detail: {
          summary: 'Get a single user',
          tags: ['Authentication']
        }
      }
    )
    .patch(
      '/users/:userId/role',
      async ({ db, params, body, set }) => {
        setCacheControl(set, 'private-no-store')
        return setUserRole(db, params.userId, body.role)
      },
      {
        admin: true,
        params: t.Object({ userId: t.String() }),
        body: t.Object({
          role: t.Union([t.Literal('user'), t.Literal('collaborator')])
        }),
        detail: {
          summary:
            'Assign or remove Collaborator; Admin changes require the database',
          tags: ['Authentication'],
          ...adminDetail
        }
      }
    )
    .get(
      '/organizations/:organizationId/users',
      async ({ db, env, params, set, status, getOrganizationAccess }) => {
        setCacheControl(set, 'private-no-store')
        const { permissions } = await getOrganizationAccess(
          params.organizationId
        )
        if (!permissions.canView) return status(403, { error: 'Forbidden' })
        return queryOrganizationMembersById(
          db,
          env.PUBLIC_REST_BASE_URL,
          params.organizationId
        )
      },
      {
        auth: true,
        params: t.Object({ organizationId: t.String() }),
        detail: {
          summary: 'Get users for a single organization',
          tags: ['Authentication'],
          ...organizationOwnerDetail
        }
      }
    )
    .post(
      '/organizations/:organizationId/users',
      async ({ db, body, params, set, status, getOrganizationAccess }) => {
        setCacheControl(set, 'private-no-store')
        const { permissions } = await getOrganizationAccess(
          params.organizationId
        )
        if (!permissions.canManageMembers)
          return status(403, { error: 'Forbidden' })
        const { email, role } = body
        if (role === 'owner' && !permissions.canAssignOwner) {
          return status(403, {
            error: 'Only Allmaps admins and collaborators can assign owners'
          })
        }

        const organization = await queryAdminOrganizationById(
          db,
          params.organizationId
        )
        if (!organization) {
          return status(404, { error: 'Organization not found' })
        }

        const user = await queryUserByEmail(db, email)
        if (!user) {
          return status(404, { error: 'User not found' })
        }

        return auth.api.addMember({
          body: {
            userId: user.id,
            role: role || 'member',
            organizationId: organization.id
          }
        })
      },
      {
        auth: true,
        params: t.Object({ organizationId: t.String() }),
        body: t.Object({
          email: t.String(),
          role: t.Optional(Role)
        }),
        detail: {
          summary: 'Add a user to a single organization',
          tags: ['Authentication'],
          ...organizationOwnerDetail
        }
      }
    )
    .delete(
      '/organizations/:organizationId/users/:userId',
      async ({ db, params, set, user }) => {
        setCacheControl(set, 'private-no-store')
        return changeOrganizationMember(
          db,
          params.organizationId,
          params.userId,
          null,
          user
        )
      },
      {
        auth: true,
        params: t.Object({ organizationId: t.String(), userId: t.String() }),
        detail: {
          summary: 'Remove a user from a single organization',
          tags: ['Authentication'],
          ...organizationOwnerDetail
        }
      }
    )
    .patch(
      '/organizations/:organizationId/users/:userId',
      async ({ db, body, params, set, user }) => {
        setCacheControl(set, 'private-no-store')
        return changeOrganizationMember(
          db,
          params.organizationId,
          params.userId,
          body.role,
          user
        )
      },
      {
        auth: true,
        params: t.Object({ organizationId: t.String(), userId: t.String() }),
        body: t.Object({
          role: Role
        }),
        detail: {
          summary: 'Update a user role in a single organization',
          tags: ['Authentication'],
          ...organizationOwnerDetail
        }
      }
    )
}
