import { t } from 'elysia'

import { queryMaps, queryChecksums } from '@allmaps/api-shared/db'

import { RegExpRoute, createElysia, createBetterAuthPlugin } from '../elysia.js'
import { adminDetail } from '../openapi.js'
import type { BetterAuthContext } from '@allmaps/db/auth'

import type { ContainedBy, IntersectsWith } from '@allmaps/api-shared/types'

const mapsQuerySchema = t.Object({
  limit: t.Optional(t.Number()),
  imageServiceDomain: t.Optional(t.String()),
  manifestDomain: t.Optional(t.String()),
  intersects: t.Optional(t.Array(t.Number())),
  containedBy: t.Optional(t.Array(t.Number())),
  minScale: t.Optional(t.Number()),
  maxScale: t.Optional(t.Number()),
  minArea: t.Optional(t.Number()),
  maxArea: t.Optional(t.Number())
})

function parseIntersects(intersects?: number[]): IntersectsWith | undefined {
  if (intersects && (intersects.length === 2 || intersects.length === 4)) {
    return intersects as IntersectsWith
  }
}

function parseContainedBy(containedBy?: number[]): ContainedBy | undefined {
  if (containedBy && containedBy.length === 4) {
    return containedBy as ContainedBy
  }
}

const mapRoute = new RegExpRoute<{
  mapId: string
  version?: string
  ext?: string
}>(
  'mapId',
  /^(?<mapId>[0-9a-f]{16})(\@(?<version>[0-9a-f]{16}))?(\.(?<ext>geojson))?$/
)

async function callLive(liveBaseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${liveBaseUrl}${path}`, {
    method: path.includes('/maps/') ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(
      (data as { error?: string }).error ?? `Live API error ${response.status}`
    )
  }
  return response.json()
}

export function createMapsRoutes(betterAuth: BetterAuthContext) {
  return createElysia({
    name: 'maps-routes'
  })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/maps',
      ({ env, db, query }) =>
        queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            intersectsWith: parseIntersects(query.intersects),
            containedBy: parseContainedBy(query.containedBy),
            limit: query.limit,
            imageServiceDomain: query.imageServiceDomain,
            manifestDomain: query.manifestDomain,
            minScale: query.minScale,
            maxScale: query.maxScale,
            minArea: query.minArea,
            maxArea: query.maxArea
          },
          { format: 'map', expectRows: false, singular: false }
        ),
      {
        query: mapsQuerySchema,
        detail: { summary: 'Get maps', tags: ['Maps'] }
      }
    )
    .get(
      '/maps.geojson',
      ({ env, db, query }) =>
        queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            intersectsWith: parseIntersects(query.intersects),
            containedBy: parseContainedBy(query.containedBy),
            limit: query.limit,
            imageServiceDomain: query.imageServiceDomain,
            manifestDomain: query.manifestDomain,
            minScale: query.minScale,
            maxScale: query.maxScale,
            minArea: query.minArea,
            maxArea: query.maxArea
          },
          { format: 'geojson', expectRows: false, singular: false }
        ),
      {
        query: mapsQuerySchema,
        detail: { summary: 'Get maps as GeoJSON', tags: ['Maps'] }
      }
    )
    .post(
      '/maps',
      async ({ env, body }) => {
        return callLive(env.PUBLIC_LIVE_BASE_URL, '/maps', body)
      },
      {
        admin: true,
        detail: {
          summary: 'Create maps from a Georeference Annotation',
          tags: ['Maps'],
          ...adminDetail
        }
      }
    )
    .get(
      '/maps/:mapId/versions',
      ({ env, db, params }) =>
        queryChecksums(env.PUBLIC_ANNOTATIONS_BASE_URL, db, params.mapId),
      {
        params: t.Object({ mapId: t.String() }),
        detail: {
          summary: 'Get all versions of a single map',
          tags: ['Maps']
        }
      }
    )

    .get(
      `/maps/${mapRoute.path}`,
      ({ env, db, params }) => {
        const { mapId, ext } = mapRoute.parse(params)
        const format = ext === 'geojson' ? 'geojson' : 'map'
        return queryMaps(
          env.PUBLIC_REST_BASE_URL,
          db,
          { mapId },
          { format, expectRows: true, singular: true }
        )
      },
      {
        params: mapRoute.params,
        detail: {
          summary: 'Get a single map',
          description: `Get a single map. Optionally specify .geojson extension to get the map in GeoJSON format.`,
          tags: ['Maps']
        }
      }
    )
    .patch(
      '/maps/:mapId',
      async ({ env, params, body }) => {
        return callLive(env.PUBLIC_LIVE_BASE_URL, `/maps/${params.mapId}`, body)
      },
      {
        admin: true,
        params: t.Object({ mapId: t.String() }),
        detail: { summary: 'Update a map', tags: ['Maps'], ...adminDetail }
      }
    )
}
