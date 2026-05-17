import { t } from 'elysia'

import { createElysia } from '../elysia.js'
import {
  queryManifests,
  createManifest,
  queryMaps
} from '@allmaps/api-shared/db'
import { queryRandom } from '@allmaps/api-shared'
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

export const manifests = createElysia({ name: 'manifests' })
  .get(
    '/manifests',
    async ({ db, env, query }) =>
      queryManifests(
        env.PUBLIC_REST_BASE_URL,
        db,
        { georeferenced: query.georeferenced, limit: query.limit },
        { expectRows: false, singular: false }
      ),
    {
      query: t.Object({
        georeferenced: t.Optional(t.Boolean()),
        limit: t.Optional(t.Number())
      }),
      detail: { summary: 'Get IIIF Manifests', tags: ['Manifests'] }
    }
  )
  .get(
    '/manifests/random',
    async ({ db, env, query }) =>
      queryRandom((op, randomId) =>
        queryManifests(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            georeferenced: query.georeferenced,
            limit: query.limit,
            randomManifestId: randomId,
            randomManifestIdOp: op
          },
          { expectRows: true, singular: false }
        )
      ),
    {
      query: t.Object({
        georeferenced: t.Optional(t.Boolean()),
        limit: t.Optional(t.Number())
      }),
      detail: { summary: 'Get a random IIIF Manifest', tags: ['Manifests'] }
    }
  )
  .get(
    '/manifests/:manifestId',
    async ({ db, params, env, query }) =>
      queryManifests(
        env.PUBLIC_REST_BASE_URL,
        db,
        { manifestId: params.manifestId, georeferenced: query.georeferenced },
        { expectRows: true, singular: true }
      ),
    {
      params: t.Object({ manifestId: t.String() }),
      query: t.Object({ georeferenced: t.Optional(t.Boolean()) }),
      detail: { summary: 'Get a single IIIF Manifest', tags: ['Manifests'] }
    }
  )
  .get(
    '/manifests/:manifestId/maps',
    async ({ env, db, params, query }) => {
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          manifestId: params.manifestId,
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
      )
    },
    {
      params: t.Object({ manifestId: t.String() }),
      query: mapsQuerySchema,
      detail: {
        summary: 'Get maps for a single IIIF Manifest',
        tags: ['Manifests']
      }
    }
  )
  .get(
    '/manifests/:manifestId/maps.geojson',
    async ({ env, db, params, query }) => {
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          manifestId: params.manifestId,
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
      )
    },
    {
      params: t.Object({ manifestId: t.String() }),
      query: mapsQuerySchema,
      detail: {
        summary: 'Get maps for a single IIIF Manifest as GeoJSON',
        tags: ['Manifests']
      }
    }
  )
  .put(
    '/manifests/:manifestId',
    async ({ db, params, body }) => {
      // TODO: add checkseum and check checksum matches manifest at URL before creating/updating
      return createManifest(db, params.manifestId, body.url)
    },
    {
      params: t.Object({ manifestId: t.String() }),
      body: t.Object({ url: t.String(), checksum: t.String() }),
      detail: {
        summary: 'Create or update a IIIF Manifest from a IIIF URL',
        tags: ['Manifests']
      }
    }
  )
