import { t } from 'elysia'

import { createElysia } from '../elysia.js'
import {
  queryImage,
  createImage,
  queryMaps,
  queryImageChecksums
} from '@allmaps/api-shared/db'
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

export const images = createElysia({ name: 'images' })
  // ── Get image metadata ────────────────────────────────────────────────────
  .get('/images/:imageId', ({ db, params }) => queryImage(db, params.imageId), {
    params: t.Object({ imageId: t.String() }),
    detail: { summary: 'Get image metadata', tags: ['Images'] }
  })
  // ── Get all versions for an image ─────────────────────────────────────────
  .get(
    '/images/:imageId/versions',
    ({ env, db, params }) =>
      queryImageChecksums(env.PUBLIC_ANNOTATIONS_BASE_URL, db, params.imageId),
    {
      params: t.Object({ imageId: t.String() }),
      detail: { summary: 'List all versions for an image', tags: ['Images'] }
    }
  )
  // ── Get maps for an image ─────────────────────────────────────────────────
  .get(
    '/images/:imageId/maps',
    ({ env, db, params, query }) =>
      queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          imageId: params.imageId,
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
      params: t.Object({ imageId: t.String() }),
      query: mapsQuerySchema,
      detail: { summary: 'Get maps for an image', tags: ['Images'] }
    }
  )
  .get(
    '/images/:imageId/maps.geojson',
    ({ env, db, params, query }) =>
      queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          imageId: params.imageId,
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
        { format: 'geojson', expectRows: true, singular: false }
      ),
    {
      params: t.Object({ imageId: t.String() }),
      query: mapsQuerySchema,
      detail: { summary: 'Get maps for an image as GeoJSON', tags: ['Images'] }
    }
  )
  // ── Create/upsert image from IIIF URL ─────────────────────────────────────
  .put(
    '/images/:imageId',
    ({ db, params, body }) => createImage(db, params.imageId, body.url),
    {
      params: t.Object({ imageId: t.String() }),
      body: t.Object({ url: t.String() }),
      detail: {
        summary: 'Create or update an image from a IIIF URL',
        tags: ['Images']
      }
    }
  )
