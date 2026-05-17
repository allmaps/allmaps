import { t } from 'elysia'

import { createElysia } from '../elysia.js'
import {
  queryImage,
  queryImages,
  createImage,
  queryMaps,
  queryImageChecksums
} from '@allmaps/api-shared/db'
import { queryRandom } from '@allmaps/api-shared'
import type { ContainedBy, IntersectsWith } from '@allmaps/api-shared/types'

const imagesQuerySchema = t.Object({
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

export const images = createElysia({ name: 'images' })
  .get(
    '/images',
    ({ env, db, query }) =>
      queryImages(
        env.PUBLIC_REST_BASE_URL,
        db,
        { georeferenced: query.georeferenced, limit: query.limit },
        { expectRows: false, singular: false }
      ),
    {
      query: imagesQuerySchema,
      detail: { summary: 'Get IIIF Images', tags: ['Images'] }
    }
  )
  .get(
    '/images/random',
    async ({ env, db, query }) =>
      queryRandom((op, randomId) =>
        queryImages(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            georeferenced: query.georeferenced,
            limit: query.limit,
            randomImageId: randomId,
            randomImageIdOp: op
          },
          { expectRows: true, singular: false }
        )
      ),
    {
      query: imagesQuerySchema,
      detail: { summary: 'Get a random IIIF Image', tags: ['Images'] }
    }
  )
  .get(
    '/images/:imageId',
    ({ env, db, params }) =>
      queryImage(env.PUBLIC_REST_BASE_URL, db, params.imageId),
    {
      params: t.Object({ imageId: t.String() }),
      detail: { summary: 'Get a single IIIF Image', tags: ['Images'] }
    }
  )
  .get(
    '/images/:imageId/versions',
    ({ env, db, params }) =>
      queryImageChecksums(env.PUBLIC_ANNOTATIONS_BASE_URL, db, params.imageId),
    {
      params: t.Object({ imageId: t.String() }),
      detail: {
        summary: 'Get all versions for a single IIIF Image',
        tags: ['Images']
      }
    }
  )
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
      detail: { summary: 'Get maps for a single IIIF Image', tags: ['Images'] }
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
      detail: {
        summary: 'Get maps for a single IIIF Image as GeoJSON',
        tags: ['Images']
      }
    }
  )
  .put(
    '/images/:imageId',
    ({ db, params, body }) => createImage(db, params.imageId, body.url),
    {
      params: t.Object({ imageId: t.String() }),
      body: t.Object({ url: t.String() }),
      detail: {
        hide: true,
        summary: 'Create or update a single IIIF Image from a IIIF URL',
        tags: ['Images']
      }
    }
  )
