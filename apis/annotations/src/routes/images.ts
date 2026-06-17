import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'
import { needsElevatedLimitRole, setCacheControl } from '@allmaps/api-shared'
import { createAuth } from '@allmaps/db/auth'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin, RegExpRoute } from '../elysia.js'

const querySchema = t.Object({
  limit: t.Optional(t.Number())
})

// Matches: imageId  OR  imageId@imageChecksum  OR  imageId.geojson etc.
const imageRoute = new RegExpRoute<{
  imageId: string
  imageChecksum?: string
  ext?: string
}>(
  'imageId',
  /^(?<imageId>[0-9a-f]+)(@(?<imageChecksum>[0-9a-f]+))?(\.(?<ext>\w+))?$/
)

export function createImagesRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({ name: 'images' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      `/images/${imageRoute.path}`,
      async ({ request, env, db, params, query, set, getLimitRole }) => {
        const { imageId, imageChecksum, ext } = imageRoute.parse(params)
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(
          set,
          userRole === 'public'
            ? imageChecksum
              ? 'public-immutable'
              : 'public-medium'
            : 'private-no-store'
        )
        const format = ext === 'geojson' ? 'geojson' : 'annotation'
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            imageId,
            ...(imageChecksum ? { imageChecksum } : {}),
            limit: query.limit,
            userRole
          },
          { id: request.url, format, expectRows: true, singular: false }
        )
      },
      {
        params: imageRoute.params,
        query: querySchema,
        detail: {
          summary:
            'Get Georeference Annotations for a single IIIF Image (with optional version)',
          tags: ['Images']
        }
      }
    )
}
