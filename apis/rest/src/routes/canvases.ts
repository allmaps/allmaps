import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import { createAuth } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { queryCanvases, queryMaps } from '@allmaps/api-shared/db'
import {
  clampLimit,
  needsElevatedLimitRole,
  normalizeMapsQueryParams,
  queryRandom,
  setCacheControl
} from '@allmaps/api-shared'

const canvasesQuerySchema = t.Object({
  georeferenced: t.Optional(t.Boolean()),
  limit: t.Optional(t.Number())
})

const mapsQuerySchema = t.Object({
  imageServiceDomain: t.Optional(t.String()),
  manifestDomain: t.Optional(t.String()),
  intersects: t.Optional(t.Array(t.Number())),
  containedBy: t.Optional(t.Array(t.Number())),
  minScale: t.Optional(t.Number()),
  maxScale: t.Optional(t.Number()),
  minArea: t.Optional(t.Number()),
  maxArea: t.Optional(t.Number()),
  modifiedAfter: t.Optional(t.String()),
  modifiedBefore: t.Optional(t.String())
})

export function createCanvasesRoutes(
  env: RestEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({ name: 'canvases' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/canvases',
      async ({ db, env, query, set, getLimitRole }) => {
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(
          set,
          userRole === 'public' ? 'public-short' : 'private-no-store'
        )
        return queryCanvases(
          env.PUBLIC_REST_BASE_URL,
          db,
          { georeferenced: query.georeferenced, limit: query.limit, userRole },
          { expectRows: false, singular: false }
        )
      },
      {
        query: canvasesQuerySchema,
        detail: { summary: 'Get IIIF Canvases', tags: ['Canvases'] }
      }
    )
    .get(
      '/canvases/random',
      async ({ db, env, query, set, getLimitRole }) => {
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(set, 'private-no-store')
        const limit = clampLimit(query.limit ?? 100, userRole)
        return queryRandom(
          limit,
          async (op, randomId, queryLimit) => {
            const canvases = await queryCanvases(
              env.PUBLIC_REST_BASE_URL,
              db,
              {
                georeferenced: query.georeferenced,
                limit: queryLimit,
                randomCanvasId: randomId,
                randomCanvasIdOp: op,
                userRole
              },
              { expectRows: false, singular: false }
            )

            return Array.isArray(canvases) ? canvases : [canvases]
          },
          'Canvases not found'
        )
      },
      {
        query: canvasesQuerySchema,
        detail: { summary: 'Get a random IIIF Canvas', tags: ['Canvases'] }
      }
    )
    .get(
      '/canvases/:canvasId',
      async ({ db, env, params, query, set }) => {
        setCacheControl(set, 'public-medium')
        return queryCanvases(
          env.PUBLIC_REST_BASE_URL,
          db,
          { canvasId: params.canvasId, georeferenced: query.georeferenced },
          { expectRows: true, singular: true }
        )
      },
      {
        params: t.Object({ canvasId: t.String() }),
        query: t.Object({ georeferenced: t.Optional(t.Boolean()) }),
        detail: { summary: 'Get a single IIIF Canvas', tags: ['Canvases'] }
      }
    )
    .get(
      '/canvases/:canvasId/maps',
      ({ request, env, db, params, set }) => {
        const queryParams = normalizeMapsQueryParams(request)
        setCacheControl(set, 'public-medium')
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            ...queryParams,
            canvasId: params.canvasId
          },
          {
            format: 'map',
            expectRows: true,
            singular: false,
            resultScope: 'complete'
          }
        )
      },
      {
        params: t.Object({ canvasId: t.String() }),
        query: mapsQuerySchema,
        detail: {
          summary: 'Get maps for a single IIIF Canvas',
          tags: ['Canvases']
        }
      }
    )
    .get(
      '/canvases/:canvasId/maps.geojson',
      ({ request, env, db, params, set }) => {
        const queryParams = normalizeMapsQueryParams(request)
        setCacheControl(set, 'public-medium')
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            ...queryParams,
            canvasId: params.canvasId
          },
          {
            format: 'geojson',
            expectRows: true,
            singular: false,
            resultScope: 'complete'
          }
        )
      },
      {
        params: t.Object({ canvasId: t.String() }),
        query: mapsQuerySchema,
        detail: {
          summary: 'Get maps for a single IIIF Canvas as GeoJSON',
          tags: ['Canvases']
        }
      }
    )
}
