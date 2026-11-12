import { t } from 'elysia'
import {
  queryStatistics,
  queryOrganizationMemberByUserId,
  queryOrganizationById
} from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'
import type { BetterAuthContext } from '@allmaps/db/auth'
import { createElysia } from '../elysia.js'

export function createStatisticsRoutes({ auth }: BetterAuthContext) {
  return createElysia({ name: 'statistics' })
    .get(
      '/statistics',
      async ({ db, request, set, status }) => {
        setCacheControl(set, 'private-no-store')
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) return status(401, { error: 'Unauthorized' })
        const roles =
          session.user.role?.split(',').map((role) => role.trim()) ?? []
        if (
          !roles.some((role) => role === 'admin' || role === 'collaborator')
        ) {
          return status(403, { error: 'Forbidden' })
        }
        return queryStatistics(db)
      },
      {
        detail: {
          summary: 'Get global statistics (admin or collaborator)',
          tags: ['Statistics']
        }
      }
    )
    .get(
      '/organizations/:organizationId/statistics',
      async ({ db, request, params, set, status }) => {
        setCacheControl(set, 'private-no-store')
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) return status(401, { error: 'Unauthorized' })
        const roles =
          session.user.role?.split(',').map((role) => role.trim()) ?? []
        if (!roles.includes('admin')) {
          const member = await queryOrganizationMemberByUserId(
            db,
            params.organizationId,
            session.user.id
          )
          if (!member) return status(403, { error: 'Forbidden' })
        }
        const organization = await queryOrganizationById(
          db,
          '',
          params.organizationId
        )
        if (!organization)
          return status(404, { error: 'Organization not found' })
        return queryStatistics(db, params.organizationId)
      },
      {
        params: t.Object({ organizationId: t.String() }),
        detail: {
          summary: 'Get organization statistics (members or admin)',
          tags: ['Statistics']
        }
      }
    )
}
