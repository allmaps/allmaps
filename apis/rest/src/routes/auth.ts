import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import { createAuth } from '@allmaps/db/auth'
import { createElysia, createBetterAuthPlugin, error } from '../elysia.js'
import { adminDetail } from '../openapi.js'
import {
  queryAdminOrganizationById,
  queryUserWithOrganizationsById,
  queryOrganizationMemberByUserId,
  queryOrganizationMembersById,
  queryUserById,
  queryUserByEmail,
  queryUsers
} from '@allmaps/api-shared/db'
import type { RestEnv } from '@allmaps/env/rest'

const Role = t.UnionEnum(['admin', 'member', 'owner'])

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
      ({ db, env, query }) =>
        queryUsers(db, env.PUBLIC_REST_BASE_URL, query.limit, true),
      {
        admin: true,
        query: t.Object({ limit: t.Optional(t.Number()) }),
        detail: {
          summary: 'Get all users',
          tags: ['Authentication'],
          ...adminDetail
        }
      }
    )
    .get(
      '/users/:userId',
      async ({ db, env, params }) => {
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
        admin: true,
        params: t.Object({ userId: t.String() }),
        detail: {
          summary: 'Get a single user',
          tags: ['Authentication'],
          ...adminDetail
        }
      }
    )
    .get(
      '/organizations/:organizationId/users',
      ({ db, env, params }) =>
        queryOrganizationMembersById(
          db,
          env.PUBLIC_REST_BASE_URL,
          params.organizationId
        ),
      {
        admin: true,
        params: t.Object({ organizationId: t.String() }),
        detail: {
          summary: 'Get users for a single organization',
          tags: ['Authentication'],
          ...adminDetail
        }
      }
    )
    .post(
      '/organizations/:organizationId/users',
      async ({ db, body, params }) => {
        const { email, role } = body

        const organization = await queryAdminOrganizationById(
          db,
          params.organizationId
        )
        if (!organization) {
          throw new Error(`Organization not found: ${params.organizationId}`)
        }

        const user = await queryUserByEmail(db, email)
        if (!user) {
          throw new Error(`User not found`)
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
        admin: true,
        params: t.Object({ organizationId: t.String() }),
        body: t.Object({
          email: t.String(),
          role: t.Optional(t.Union([Role, t.Array(Role)]))
        }),
        detail: {
          summary: 'Add a user to a single organization',
          tags: ['Authentication'],
          ...adminDetail
        }
      }
    )
    .delete(
      '/organizations/:organizationId/users/:userId',
      async ({ db, env, params, request }) => {
        const { organizationId, userId } = params

        const organization = await queryAdminOrganizationById(
          db,
          organizationId
        )
        if (!organization) {
          throw new Error(`Organization not found: ${organizationId}`)
        }

        const user = await queryUserById(db, env.PUBLIC_REST_BASE_URL, userId)
        if (!user) {
          throw new Error(`User not found`)
        }

        return auth.api.removeMember({
          body: {
            memberIdOrEmail: user.email,
            organizationId: organization.id
          },
          headers: request.headers
        })
      },
      {
        admin: true,
        params: t.Object({ organizationId: t.String(), userId: t.String() }),
        detail: {
          summary: 'Remove a user from a single organization',
          tags: ['Authentication'],
          ...adminDetail
        }
      }
    )
    .patch(
      '/organizations/:organizationId/users/:userId',
      async ({ db, body, params, request }) => {
        const { organizationId, userId } = params
        const { role } = body

        const organization = await queryAdminOrganizationById(
          db,
          organizationId
        )
        if (!organization) {
          throw new Error(`Organization not found: ${organizationId}`)
        }

        const member = await queryOrganizationMemberByUserId(
          db,
          organizationId,
          userId
        )

        if (!member) {
          throw new Error(`Organization user not found`)
        }

        return auth.api.updateMemberRole({
          body: {
            memberId: member.id,
            role,
            organizationId: organization.id
          },
          headers: request.headers
        })
      },
      {
        admin: true,
        params: t.Object({ organizationId: t.String(), userId: t.String() }),
        body: t.Object({
          role: Role
        }),
        detail: {
          summary: 'Update a user role in a single organization',
          tags: ['Authentication'],
          ...adminDetail
        }
      }
    )
}
