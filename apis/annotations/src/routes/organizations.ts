import { mapsQuerySchema } from '@allmaps/api-shared/elysia'
import { ResponseError, setCacheControl } from '@allmaps/api-shared'
import { queryMaps, queryOrganizationBySlug } from '@allmaps/api-shared/db'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin, RegExpRoute } from '../elysia.js'
import { readAnnotationQuery } from '../query.js'

const organizationRoute = new RegExpRoute<{
  organizationSlug: string
  ext?: string
}>(
  'organizationSlug',
  /^(?<organizationSlug>[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.(?<ext>\w+))?$/
)

export function createOrganizationsRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext
) {
  return createElysia({ name: 'organizations' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      `/organizations/${organizationRoute.path}`,
      async ({ request, env, db, params, set, getOrganizationLimitRole }) => {
        const { organizationSlug, ext } = organizationRoute.parse(params)
        const organization = await queryOrganizationBySlug(
          db,
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          organizationSlug
        )

        if (!organization || !organization.plan) {
          throw new ResponseError('Organization not found', 404)
        }

        const { filters, userRole } = await readAnnotationQuery(request, () =>
          getOrganizationLimitRole({ slug: organizationSlug })
        )
        setCacheControl(
          set,
          userRole === 'public' ? 'public-medium' : 'private-no-store'
        )

        const format = ext === 'geojson' ? 'geojson' : 'annotation'
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            ...filters,
            userRole,
            organizationSlug
          },
          {
            id: request.url,
            format,
            excludeArchived: true,
            expectRows: false,
            singular: false
          }
        )
      },
      {
        params: organizationRoute.params,
        query: mapsQuerySchema,
        detail: {
          summary: 'Get Georeference Annotations for a single organization',
          tags: ['Organizations']
        }
      }
    )
}
