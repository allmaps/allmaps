import { t } from 'elysia'

import { createBetterAuthPlugin, error } from '../elysia.js'

import { auth } from '@allmaps/db/auth'
import {
  queryAdminOrganizations,
  queryUserOrganizationsWithRoles,
  queryAllUserOrganizations,
  queryAllOrganizationMembers,
  queryOrganizationBySlug,
  queryUserByEmail,
  queryUsers,
  queryUserBySlug
} from '@allmaps/api-shared/db'

const Role = t.UnionEnum(['admin', 'member', 'owner'])

export const betterAuthPlugin = createBetterAuthPlugin()
  .get('/users', ({ db }) => queryUsers(db), {
    admin: true,
    detail: {
      summary: 'List all users',
      description: 'Returns all users (Admin only)',
      tags: ['Authentication']
    }
  })
  .get(
    '/users/:slug',
    async ({ db, params }) => {
      const user = await queryUserBySlug(db, params.slug)

      if (!user) {
        error(404, `User not found: ${params.slug}`)
      }

      return user
    },
    {
      admin: true,
      detail: {
        summary: 'Get user by slug',
        description: 'Returns a user by slug (Admin only)',
        tags: ['Authentication']
      }
    }
  )
  .get('/admin/organizations', ({ db }) => queryAdminOrganizations(db), {
    admin: true,
    detail: {
      summary: 'List all organizations',
      description: 'Returns all organizations (Admin only)',
      tags: ['Authentication']
    }
  })
  .get(
    '/admin/users/:userId/organizations',
    ({ db, params }) => queryUserOrganizationsWithRoles(db, params.userId),
    {
      admin: true,
      detail: {
        summary: 'List organizations for a user',
        description: 'Returns all organizations a user belongs to (Admin only)',
        tags: ['Authentication']
      }
    }
  )
  .get(
    '/admin/users/organizations',
    ({ db }) => queryAllUserOrganizations(db),
    {
      admin: true,
      detail: {
        summary: 'List all user–organization memberships',
        description:
          'Returns a map of userId → organizations for all users (Admin only)',
        tags: ['Authentication']
      }
    }
  )
  .get(
    '/admin/organizations/members',
    ({ db }) => queryAllOrganizationMembers(db),
    {
      admin: true,
      detail: {
        summary: 'List all organization members',
        description:
          'Returns a map of organizationId → members for all organizations (Admin only)',
        tags: ['Authentication']
      }
    }
  )
  .post(
    '/organizations/:organizationSlug/add-member',
    async ({ db, body, params }) => {
      const { email, role } = body

      const organization = await queryOrganizationBySlug(
        db,
        params.organizationSlug
      )
      if (!organization) {
        throw new Error(
          `Organization not found with slug: ${params.organizationSlug}`
        )
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
      body: t.Object({
        email: t.String(),
        role: t.Optional(t.Union([Role, t.Array(Role)]))
      })
    }
  )
  .post(
    '/organizations/:organizationSlug/remove-member',
    async ({ db, body, params, request }) => {
      const { email } = body

      const organization = await queryOrganizationBySlug(
        db,
        params.organizationSlug
      )
      if (!organization) {
        throw new Error(
          `Organization not found with slug: ${params.organizationSlug}`
        )
      }

      const user = await queryUserByEmail(db, email)
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
      body: t.Object({
        email: t.String()
      })
    }
  )
  .post(
    '/organizations/:organizationSlug/update-member-role',
    async ({ db, body, params, request }) => {
      const { memberId, role } = body

      const organization = await queryOrganizationBySlug(
        db,
        params.organizationSlug
      )
      if (!organization) {
        throw new Error(
          `Organization not found with slug: ${params.organizationSlug}`
        )
      }

      return auth.api.updateMemberRole({
        body: {
          memberId,
          role,
          organizationId: organization.id
        },
        headers: request.headers
      })
    },
    {
      admin: true,
      body: t.Object({
        memberId: t.String(),
        role: Role
      })
    }
  )
