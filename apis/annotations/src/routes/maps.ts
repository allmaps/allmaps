import { t } from 'elysia'

import { generateRandomId } from '@allmaps/id/sync'
import { queryMaps } from '@allmaps/api-shared/db'
import type { ContainedBy, IntersectsWith } from '@allmaps/api-shared/types'

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

// Matches: mapId  OR  mapId@checksum  OR  mapId.geojson  OR  mapId@checksum.annotation etc.
const mapRoute = new RegExpRoute<{
  mapId: string
  checksum?: string
  ext?: string
}>('mapId', /^(?<mapId>[0-9a-f]+)(@(?<checksum>[0-9a-f]+))?(\.(?<ext>\w+))?$/)

async function callLive(liveBaseUrl: string, body: unknown) {
  const response = await fetch(`${liveBaseUrl}/maps`, {
    method: 'POST',
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

export const maps = createElysia({ name: 'maps' })
  // ── List all maps ─────────────────────────────────────────────────────────
  .get(
    '/maps',
    ({ request, env, db, query }) =>
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
        {
          id: request.url,
          format: 'annotation',
          expectRows: false,
          singular: false
        }
      ),
    {
      query: mapsQuerySchema,
      detail: { summary: 'List maps as annotations', tags: ['Maps'] }
    }
  )
  .get(
    '/maps.geojson',
    ({ request, env, db, query }) =>
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
        {
          id: request.url,
          format: 'geojson',
          expectRows: false,
          singular: false
        }
      ),
    {
      query: mapsQuerySchema,
      detail: { summary: 'List maps as GeoJSON', tags: ['Maps'] }
    }
  )
  // ── Create maps from annotation body ─────────────────────────────────────
  .post('/maps', ({ env, body }) => callLive(env.PUBLIC_LIVE_BASE_URL, body), {
    detail: {
      summary: 'Create maps from a Georeference Annotation',
      tags: ['Maps']
    }
  })
  // ── Random map (must be before :mapId wildcard) ───────────────────────────
  .get(
    '/maps/random',
    ({ env, db, query }) => {
      const randomMapId = generateRandomId()

      // Try maps with id > randomMapId first, fall back to id <= randomMapId
      const baseQuery = {
        intersectsWith: parseIntersects(query.intersects),
        containedBy: parseContainedBy(query.containedBy),
        imageServiceDomain: query.imageServiceDomain,
        manifestDomain: query.manifestDomain,
        minScale: query.minScale,
        maxScale: query.maxScale,
        minArea: query.minArea,
        maxArea: query.maxArea,
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
      detail: { summary: 'Get a random map as annotation', tags: ['Maps'] }
    }
  )
  // ── Single map (with optional @checksum and .ext) ─────────────────────────
  .get(
    `/maps/${mapRoute.path}`,
    ({ env, db, params }) => {
      const { mapId, checksum, ext } = mapRoute.parse(params)
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
        summary: 'Get a map as annotation (with optional version)',
        tags: ['Maps']
      }
    }
  )
