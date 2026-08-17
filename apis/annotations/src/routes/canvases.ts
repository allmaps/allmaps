import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'
import { createAuth } from '@allmaps/db/auth'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'

export function createCanvasesRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({ name: 'canvases' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/canvases/:canvasId',
      ({ request, env, db, params, set }) => {
        setCacheControl(set, 'public-medium')
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { canvasId: params.canvasId },
          {
            id: request.url,
            format: 'annotation',
            expectRows: true,
            singular: false,
            resultScope: 'complete'
          }
        )
      },
      {
        params: t.Object({ canvasId: t.String() }),
        detail: {
          summary: 'Get Georeference Annotations for a single IIIF Canvas',
          tags: ['Canvases']
        }
      }
    )
}
