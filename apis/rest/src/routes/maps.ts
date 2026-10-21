import { t } from 'elysia'

import { queryMaps, queryChecksums } from '@allmaps/api-shared/db'
import {
  needsElevatedLimitRole,
  normalizeMapsQueryParams,
  setCacheControl
} from '@allmaps/api-shared'

import {
  RegExpRoute,
  createElysia,
  createBetterAuthPlugin,
  error
} from '../elysia.js'
import { adminDetail } from '../openapi.js'
import type { BetterAuthContext } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

const mapsQuerySchema = t.Object({
  limit: t.Optional(t.Number()),
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

const mapRoute = new RegExpRoute<{
  mapId: string
  version?: string
  ext?: string
}>(
  'mapId',
  /^(?<mapId>[0-9a-f]{16})(@(?<version>[0-9a-f]{16}))?(\.(?<ext>geojson))?$/
)

async function callLive(env: RestEnv, path: string, body: unknown) {
  if (!env.LIVE_IMPORT_SECRET) {
    return error(503, 'Georeference imports are not configured')
  }

  const url = new URL(`${env.PUBLIC_LIVE_BASE_URL}${path}`)
  const localHttp =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    (url.protocol !== 'https:' && !localHttp) ||
    url.username ||
    url.password
  ) {
    return error(503, 'Live imports require HTTPS or local HTTP')
  }

  const response = await fetch(url, {
    method: path.includes('/maps/') ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.LIVE_IMPORT_SECRET}`
    },
    redirect: 'error',
    body: JSON.stringify(body)
  })

  if (response.status === 401 || response.status === 403) {
    return error(502, 'Live import authentication failed')
  }
  if (response.status === 503) {
    return error(503, 'Georeference imports are unavailable')
  }

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
      async ({ request, env, db, set, getLimitRole }) => {
        const queryParams = normalizeMapsQueryParams(request)
        const userRole = needsElevatedLimitRole(queryParams.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(
          set,
          userRole === 'public' ? 'public-short' : 'private-no-store'
        )
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { ...queryParams, userRole },
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
      async ({ request, env, db, set, getLimitRole }) => {
        const queryParams = normalizeMapsQueryParams(request)
        const userRole = needsElevatedLimitRole(queryParams.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(
          set,
          userRole === 'public' ? 'public-short' : 'private-no-store'
        )
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { ...queryParams, userRole },
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
        return callLive(env, '/maps', body)
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
        return callLive(env, `/maps/${encodeURIComponent(params.mapId)}`, body)
      },
      {
        admin: true,
        params: t.Object({ mapId: t.String() }),
        detail: { summary: 'Update a map', tags: ['Maps'], ...adminDetail }
      }
    )
}
