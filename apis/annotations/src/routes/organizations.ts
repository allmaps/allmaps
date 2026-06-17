import { t } from 'elysia'

import {
  needsElevatedLimitRole,
  ResponseError,
  setCacheControl
} from '@allmaps/api-shared'
import { queryMaps, queryOrganizationBySlug } from '@allmaps/api-shared/db'
import { createAuth } from '@allmaps/db/auth'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin, RegExpRoute } from '../elysia.js'

const querySchema = t.Object({
  limit: t.Optional(t.Number())
})

const organizationRoute = new RegExpRoute<{
  organizationSlug: string
  ext?: string
}>(
  'organizationSlug',
  /^(?<organizationSlug>[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.(?<ext>\w+))?$/
)

export function createOrganizationsRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({ name: 'organizations' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      `/organizations/${organizationRoute.path}`,
      async ({
        request,
        env,
        db,
        params,
        query,
        set,
        getOrganizationLimitRole
      }) => {
        const { organizationSlug, ext } = organizationRoute.parse(params)
        const organization = await queryOrganizationBySlug(
          db,
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          organizationSlug
        )

        if (!organization || !organization.plan) {
          throw new ResponseError('Organization not found', 404)
        }

        const userRole = needsElevatedLimitRole(query.limit)
          ? await getOrganizationLimitRole({ slug: organizationSlug })
          : 'public'
        setCacheControl(
          set,
          userRole === 'public' ? 'public-medium' : 'private-no-store'
        )

        const format = ext === 'geojson' ? 'geojson' : 'annotation'
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            organizationSlug,
            limit: query.limit,
            userRole
          },
          { id: request.url, format, expectRows: true, singular: false }
        )
      },
      {
        params: organizationRoute.params,
        query: querySchema,
        detail: {
          summary: 'Get Georeference Annotations for a single organization',
          tags: ['Organizations']
        }
      }
    )
}
