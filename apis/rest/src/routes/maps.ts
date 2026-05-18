import { t } from 'elysia'

import { queryMaps, queryChecksums } from '@allmaps/api-shared/db'
import { normalizeMapsQueryParams, setCacheControl } from '@allmaps/api-shared'

import { RegExpRoute, createElysia, createBetterAuthPlugin } from '../elysia.js'
import { adminDetail } from '../openapi.js'
import type { BetterAuthContext } from '@allmaps/db/auth'

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

const mapRoute = new RegExpRoute<{
  mapId: string
  version?: string
  ext?: string
}>(
  'mapId',
  /^(?<mapId>[0-9a-f]{16})(@(?<version>[0-9a-f]{16}))?(\.(?<ext>geojson))?$/
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
      ({ request, env, db, set }) => {
        setCacheControl(set, 'public-short')
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          normalizeMapsQueryParams(request),
          { format: 'map', expectRows: false, singular: false }
        )
      },
      {
        query: mapsQuerySchema,
        detail: { summary: 'Get maps', tags: ['Maps'] }
      }
    )
    .get(
      '/maps.geojson',
      ({ request, env, db, set }) => {
        setCacheControl(set, 'public-short')
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          normalizeMapsQueryParams(request),
          { format: 'geojson', expectRows: false, singular: false }
        )
      },
      {
        query: mapsQuerySchema,
        detail: { summary: 'Get maps as GeoJSON', tags: ['Maps'] }
      }
    )
    .post(
      '/maps',
      async ({ env, body, set }) => {
        setCacheControl(set, 'private-no-store')
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
      ({ env, db, params, set }) => {
        setCacheControl(set, 'public-medium')
        return queryChecksums(env.PUBLIC_ANNOTATIONS_BASE_URL, db, params.mapId)
      },
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
      ({ env, db, params, set }) => {
        const { mapId, version, ext } = mapRoute.parse(params)
        setCacheControl(set, version ? 'public-immutable' : 'public-medium')
        const format = ext === 'geojson' ? 'geojson' : 'map'
        return queryMaps(
          env.PUBLIC_REST_BASE_URL,
          db,
          { mapId, ...(version ? { checksum: version } : {}) },
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
      async ({ env, params, body, set }) => {
        setCacheControl(set, 'private-no-store')
        return callLive(env.PUBLIC_LIVE_BASE_URL, `/maps/${params.mapId}`, body)
      },
      {
        admin: true,
        params: t.Object({ mapId: t.String() }),
        detail: { summary: 'Update a map', tags: ['Maps'], ...adminDetail }
      }
    )
}
