import { t } from 'elysia'
import {
  queryStatistics,
  queryStatisticsHistory,
  queryOrganizationMemberByUserId,
  queryOrganizationById
} from '@allmaps/api-shared/db'
import { setCacheControl, ResponseError } from '@allmaps/api-shared'
import type { BetterAuthContext } from '@allmaps/db/auth'
import type { Db } from '@allmaps/db'
import { createElysia } from '../elysia.js'

const historyQuery = t.Object({
  from: t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  through: t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  interval: t.Union([
    t.Literal('day'),
    t.Literal('week'),
    t.Literal('month'),
    t.Literal('year')
  ])
})
const organizationParams = t.Object({ organizationId: t.String() })

export function createStatisticsRoutes({ auth }: BetterAuthContext) {
  async function authorize(db: Db, request: Request, organizationId?: string) {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new ResponseError('Unauthorized', 401)
    const roles = session.user.role?.split(',').map((role) => role.trim()) ?? []
    if (organizationId === undefined) {
      if (!roles.some((role) => role === 'admin' || role === 'collaborator'))
        throw new ResponseError('Forbidden', 403)
    } else {
      if (
        !roles.includes('admin') &&
        !(await queryOrganizationMemberByUserId(
          db,
          organizationId,
          session.user.id
        ))
      )
        throw new ResponseError('Forbidden', 403)
      if (!(await queryOrganizationById(db, '', organizationId)))
        throw new ResponseError('Organization not found', 404)
    }
  }
  return createElysia({ name: 'statistics' })
    .get(
      '/statistics',
      async ({ db, request, set }) => {
        setCacheControl(set, 'private-no-store')
        await authorize(db, request)
        return queryStatistics(db)
      },
      {
        detail: {
          summary: 'Get daily global statistics (admin or collaborator)',
          tags: ['Statistics']
        }
      }
    )
    .get(
      '/statistics/history',
      async ({ db, request, set, query }) => {
        setCacheControl(set, 'private-no-store')
        await authorize(db, request)
        return queryStatisticsHistory(db, query)
      },
      {
        query: historyQuery,
        detail: {
          summary: 'Get global statistics by day, week, month or year',
          tags: ['Statistics']
        }
      }
    )
    .get(
      '/organizations/:organizationId/statistics',
      async ({ db, request, params, set }) => {
        setCacheControl(set, 'private-no-store')
        await authorize(db, request, params.organizationId)
        return queryStatistics(db, params.organizationId)
      },
      {
        params: organizationParams,
        detail: {
          summary: 'Get daily organization statistics (members or admin)',
          tags: ['Statistics']
        }
      }
    )
    .get(
      '/organizations/:organizationId/statistics/history',
      async ({ db, request, params, set, query }) => {
        setCacheControl(set, 'private-no-store')
        await authorize(db, request, params.organizationId)
        return queryStatisticsHistory(db, {
          ...query,
          organizationId: params.organizationId
        })
      },
      {
        params: organizationParams,
        query: historyQuery,
        detail: {
          summary: 'Get organization statistics by day, week, month or year',
          tags: ['Statistics']
        }
      }
    )
}
