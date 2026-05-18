import { t } from 'elysia'

import { createElysia } from '../elysia.js'
import { queryCanvases, queryMaps } from '@allmaps/api-shared/db'
import {
  normalizeMapsQueryParams,
  queryRandom,
  setCacheControl
} from '@allmaps/api-shared'

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

export const canvases = createElysia({ name: 'canvases' })
  .get(
    '/canvases',
    async ({ db, env, query, set }) => {
      setCacheControl(set, 'public-short')
      return queryCanvases(
        env.PUBLIC_REST_BASE_URL,
        db,
        { georeferenced: query.georeferenced, limit: query.limit },
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
    async ({ db, env, query, set }) => {
      setCacheControl(set, 'private-no-store')
      return queryRandom((op, randomId) =>
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
      setCacheControl(set, 'public-short')
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          ...normalizeMapsQueryParams(request),
          canvasId: params.canvasId
        },
        { format: 'map', expectRows: true, singular: false }
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
