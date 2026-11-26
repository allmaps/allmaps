import { mapsQuerySchema } from '@allmaps/api-shared/elysia'
import { queryMaps } from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin, RegExpRoute } from '../elysia.js'
import { readAnnotationQuery } from '../query.js'

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
  betterAuth: BetterAuthContext
) {
  return createElysia({ name: 'images' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      `/images/${imageRoute.path}`,
      async ({ request, env, db, params, set, getLimitRole }) => {
        const { imageId, imageChecksum, ext } = imageRoute.parse(params)
        const { filters, userRole } = await readAnnotationQuery(
          request,
          getLimitRole
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
            imageId,
            ...(imageChecksum ? { imageChecksum } : {})
          },
          {
            id: request.url,
            format,
            excludeArchived: true,
            expectIiifResource: true,
            singular: false,
            resultScope: filters.limit === undefined ? 'complete' : 'bounded'
          }
        )
      },
      {
        params: imageRoute.params,
        query: mapsQuerySchema,
        detail: {
          summary:
            'Get Georeference Annotations for a single IIIF Image (with optional version)',
          tags: ['Images']
        }
      }
    )
}
