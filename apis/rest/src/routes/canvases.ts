import { t } from 'elysia'

import { createElysia } from '../elysia.js'
import { queryCanvases, queryMaps } from '@allmaps/api-shared/db'
import { queryRandom } from '@allmaps/api-shared'

import type { ContainedBy, IntersectsWith } from '@allmaps/api-shared/types'

const canvasesQuerySchema = t.Object({
  georeferenced: t.Optional(t.Boolean()),
  limit: t.Optional(t.Number())
})

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

export const canvases = createElysia({ name: 'canvases' })
  .get(
    '/canvases',
    async ({ db, env, query }) =>
      queryCanvases(
        env.PUBLIC_REST_BASE_URL,
        db,
        { georeferenced: query.georeferenced, limit: query.limit },
        { expectRows: false, singular: false }
      ),
    {
      query: canvasesQuerySchema,
      detail: { summary: 'Get IIIF Canvases', tags: ['Canvases'] }
    }
  )
  .get(
    '/canvases/random',
    async ({ db, env, query }) =>
      queryRandom((op, randomId) =>
        queryCanvases(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            georeferenced: query.georeferenced,
            limit: query.limit,
            randomCanvasId: randomId,
            randomCanvasIdOp: op
          },
          { expectRows: true, singular: false }
        )
      ),
    {
      query: canvasesQuerySchema,
      detail: { summary: 'Get a random IIIF Canvas', tags: ['Canvases'] }
    }
  )
  .get(
    '/canvases/:canvasId',
    async ({ db, env, params, query }) =>
      queryCanvases(
        env.PUBLIC_REST_BASE_URL,
        db,
        { canvasId: params.canvasId, georeferenced: query.georeferenced },
        { expectRows: true, singular: true }
      ),
    {
      params: t.Object({ canvasId: t.String() }),
      query: t.Object({ georeferenced: t.Optional(t.Boolean()) }),
      detail: { summary: 'Get a single IIIF Canvas', tags: ['Canvases'] }
    }
  )
  .get(
    '/canvases/:canvasId/maps',
    ({ env, db, params, query }) =>
      queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          canvasId: params.canvasId,
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
        { format: 'map', expectRows: true, singular: false }
      ),
    {
      params: t.Object({ canvasId: t.String() }),
      query: mapsQuerySchema,
      detail: {
        summary: 'Get maps for a single IIIF Canvas',
        tags: ['Canvases']
      }
    }
  )
