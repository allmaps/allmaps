import { ResponseError, setCacheControl } from '@allmaps/api-shared'
import { queryMaps, queryOrganizationBySlug } from '@allmaps/api-shared/db'
import { createAuth } from '@allmaps/db/auth'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, RegExpRoute } from '../elysia.js'

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
  void betterAuth

  return createElysia({ name: 'organizations' }).get(
    `/organizations/${organizationRoute.path}`,
    async ({ request, env, db, params, set }) => {
      const { organizationSlug, ext } = organizationRoute.parse(params)
      const organization = await queryOrganizationBySlug(
        db,
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        organizationSlug
      )

      if (!organization || !organization.plan) {
        throw new ResponseError('Organization not found', 404)
      }

      setCacheControl(set, 'public-medium')

      const format = ext === 'geojson' ? 'geojson' : 'annotation'
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          organizationSlug
        },
        { id: request.url, format, expectRows: true, singular: false }
      )
    },
    {
      params: organizationRoute.params,
      detail: {
        summary: 'Get Georeference Annotations for a single organization',
        tags: ['Organizations']
      }
    }
  )
}
