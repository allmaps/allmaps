import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'
import { needsElevatedLimitRole, setCacheControl } from '@allmaps/api-shared'
import { createAuth } from '@allmaps/db/auth'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'

const querySchema = t.Object({
  limit: t.Optional(t.Number())
})

export function createCanvasesRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({ name: 'canvases' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/canvases/:canvasId',
      async ({ request, env, db, params, query, set, getLimitRole }) => {
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(
          set,
          userRole === 'public' ? 'public-medium' : 'private-no-store'
        )
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { canvasId: params.canvasId, limit: query.limit, userRole },
          {
            id: request.url,
            format: 'annotation',
            expectRows: true,
            singular: false
          }
        )
      },
      {
        params: t.Object({ canvasId: t.String() }),
        query: querySchema,
        detail: {
          summary: 'Get Georeference Annotations for a single IIIF Canvas',
          tags: ['Canvases']
        }
      }
    )
}
