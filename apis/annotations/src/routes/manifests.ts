import { mapsQuerySchema } from '@allmaps/api-shared/elysia'
import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { readAnnotationQuery } from '../query.js'

export function createManifestsRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext
) {
  return createElysia({ name: 'manifests' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/manifests/:manifestId',
      async ({ request, env, db, params, set, getLimitRole }) => {
        const { filters, userRole } = await readAnnotationQuery(
          request,
          getLimitRole
        )
        setCacheControl(
          set,
          userRole === 'public' ? 'public-medium' : 'private-no-store'
        )
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { ...filters, userRole, manifestId: params.manifestId },
          {
            id: request.url,
            format: 'annotation',
            excludeArchived: true,
            expectIiifResource: true,
            singular: false,
            resultScope: filters.limit === undefined ? 'complete' : 'bounded'
          }
        )
      },
      {
        params: t.Object({ manifestId: t.String() }),
        query: mapsQuerySchema,
        detail: {
          summary: 'Get Georeference Annotations for a single IIIF Manifest',
          tags: ['Manifests']
        }
      }
    )
}
