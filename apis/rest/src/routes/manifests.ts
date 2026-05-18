import { t } from 'elysia'

import { createElysia } from '../elysia.js'
import {
  queryManifests,
  createManifest,
  queryMaps
} from '@allmaps/api-shared/db'
import { normalizeMapsQueryParams, queryRandom } from '@allmaps/api-shared'

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
    async ({ request, env, db, params }) => {
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          ...normalizeMapsQueryParams(request),
          manifestId: params.manifestId
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
    async ({ request, env, db, params }) => {
      return queryMaps(
        env.PUBLIC_ANNOTATIONS_BASE_URL,
        db,
        {
          ...normalizeMapsQueryParams(request),
          manifestId: params.manifestId
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
        hide: true,
        summary: 'Create or update a IIIF Manifest from a IIIF URL',
        tags: ['Manifests']
      }
    }
  )
