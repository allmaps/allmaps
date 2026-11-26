import { mapsQuerySchema } from '@allmaps/api-shared/elysia'
import { generateAnnotation, type GeoreferencedMap } from '@allmaps/annotation'
import { queryMaps } from '@allmaps/api-shared/db'
import {
  normalizeMapsQueryParams,
  queryRandom,
  setCacheControl
} from '@allmaps/api-shared'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin, RegExpRoute } from '../elysia.js'
import { readAnnotationQuery } from '../query.js'

const mapRoute = new RegExpRoute<{
  mapId: string
  checksum?: string
  ext?: string
}>('mapId', /^(?<mapId>[0-9a-f]+)(@(?<checksum>[0-9a-f]+))?(\.(?<ext>\w+))?$/)

export function createMapsRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext
) {
  return createElysia({ name: 'maps' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/maps',
      async ({ request, env, db, set, getLimitRole }) => {
        const { filters, userRole } = await readAnnotationQuery(
          request,
          getLimitRole
        )
        setCacheControl(
          set,
          userRole === 'public' ? 'public-short' : 'private-no-store'
        )
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { ...filters, userRole },
          {
            id: request.url,
            format: 'annotation',
            excludeArchived: true,
            expectRows: false,
            singular: false
          }
        )
      },
      {
        query: mapsQuerySchema,
        detail: {
          summary: 'Get Georeference Annotations',
          tags: ['Maps']
        }
      }
    )
    .get(
      '/maps.geojson',
      async ({ request, env, db, set, getLimitRole }) => {
        const { filters, userRole } = await readAnnotationQuery(
          request,
          getLimitRole
        )
        setCacheControl(
          set,
          userRole === 'public' ? 'public-short' : 'private-no-store'
        )
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { ...filters, userRole },
          {
            id: request.url,
            format: 'geojson',
            excludeArchived: true,
            expectRows: false,
            singular: false
          }
        )
      },
      {
        query: mapsQuerySchema,
        detail: {
          summary: 'Get Georeference Annotations as GeoJSON',
          tags: ['Maps']
        }
      }
    )
    .get(
      '/maps/random',
      async ({ request, env, db, set }) => {
        setCacheControl(set, 'private-no-store')
        const baseQuery = {
          ...normalizeMapsQueryParams(request),
          limit: 1
        }
        const maps = await queryRandom(
          1,
          async (op, randomMapId, limit) =>
            (await queryMaps(
              env.PUBLIC_ANNOTATIONS_BASE_URL,
              db,
              {
                ...baseQuery,
                limit,
                randomMapId,
                randomMapIdOp: op
              },
              {
                format: 'map',
                excludeArchived: true,
                expectRows: false,
                singular: false
              }
            )) as GeoreferencedMap[],
          'Maps not found'
        )

        return generateAnnotation(maps[0])
      },
      {
        query: mapsQuerySchema,
        detail: {
          summary: 'Get random Georeference Annotations',
          tags: ['Maps']
        }
      }
    )
    .get(
      `/maps/${mapRoute.path}`,
      ({ env, db, params, request, set }) => {
        const { mapId, checksum, ext } = mapRoute.parse(params)
        setCacheControl(set, 'public-medium')
        const format = ext === 'geojson' ? 'geojson' : 'annotation'
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            ...normalizeMapsQueryParams(request),
            mapId,
            ...(checksum ? { checksum } : {})
          },
          { format, excludeArchived: true, expectRows: true, singular: true }
        )
      },
      {
        params: mapRoute.params,
        query: mapsQuerySchema,
        detail: {
          summary:
            'Get a single Georeference Annotation (with optional version)',
          tags: ['Maps']
        }
      }
    )
}
