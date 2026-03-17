import { t } from 'elysia'

import { createElysia } from '../elysia.js'
import {
  queryManifest,
  createManifest,
  queryMaps
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

export const manifests = createElysia({ name: 'manifests' })
  // ── Get manifest metadata ─────────────────────────────────────────────────
  .get(
    '/manifests/:manifestId',
    async ({ db, params }) => {
      return queryManifest(db, params.manifestId)
    },
    {
      params: t.Object({ manifestId: t.String() }),
      detail: { summary: 'Get manifest metadata', tags: ['Manifests'] }
    }
  )
  // ── Get maps for a manifest ───────────────────────────────────────────────
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
      detail: { summary: 'Get maps for a manifest', tags: ['Manifests'] }
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
        summary: 'Get maps for a manifest as GeoJSON',
        tags: ['Manifests']
      }
    }
  )
  // ── Create/upsert manifest from IIIF URL ──────────────────────────────────
  .put(
    '/manifests/:manifestId',
    async ({ db, params, body }) => {
      return createManifest(db, params.manifestId, body.url)
    },
    {
      params: t.Object({ manifestId: t.String() }),
      body: t.Object({ url: t.String() }),
      detail: {
        summary: 'Create or update a manifest from a IIIF URL',
        tags: ['Manifests']
      }
    }
  )
