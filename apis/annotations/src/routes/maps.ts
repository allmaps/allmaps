import { t } from 'elysia'

import { generateRandomId } from '@allmaps/id/sync'
import { queryMaps } from '@allmaps/api-shared/db'
import { normalizeMapsQueryParams, setCacheControl } from '@allmaps/api-shared'

import { createElysia, RegExpRoute } from '../elysia.js'

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
  checksum?: string
  ext?: string
}>('mapId', /^(?<mapId>[0-9a-f]+)(@(?<checksum>[0-9a-f]+))?(\.(?<ext>\w+))?$/)

export const maps = createElysia({ name: 'maps' })
  .get(
    '/maps',
    ({ request, env, db, set }) => {
      setCacheControl(set, 'public-short')
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        normalizeMapsQueryParams(request),
        {
          id: request.url,
          format: 'annotation',
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
    ({ request, env, db, set }) => {
      setCacheControl(set, 'public-short')
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        normalizeMapsQueryParams(request),
        {
          id: request.url,
          format: 'geojson',
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
    ({ request, env, db, set }) => {
      setCacheControl(set, 'private-no-store')
      const randomMapId = generateRandomId()

      // Try maps with id > randomMapId first, fall back to id <= randomMapId
      const baseQuery = {
        ...normalizeMapsQueryParams(request),
        limit: 1
      }
      const responseOptions = {
        format: 'annotation' as const,
        expectRows: true,
        singular: true
      }

      try {
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { ...baseQuery, randomMapId, randomMapIdOp: 'gt' },
          responseOptions
        )
      } catch {
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          { ...baseQuery, randomMapId, randomMapIdOp: 'lte' },
          responseOptions
        )
      }
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
    ({ env, db, params, set }) => {
      const { mapId, checksum, ext } = mapRoute.parse(params)
      setCacheControl(set, checksum ? 'public-immutable' : 'public-medium')
      const format = ext === 'geojson' ? 'geojson' : 'annotation'
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          mapId,
          ...(checksum ? { checksum } : {})
        },
        { format, expectRows: true, singular: true }
      )
    },
    {
      params: mapRoute.params,
      detail: {
        summary: 'Get a single Georeference Annotation (with optional version)',
        tags: ['Maps']
      }
    }
  )
