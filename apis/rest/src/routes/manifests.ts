import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { Db } from '@allmaps/db'
import { createAuth } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { adminDetail } from '../openapi.js'
import {
  queryManifests,
  createManifest,
  createManifestFromUrl,
  queryMaps
} from '@allmaps/api-shared/db'
import {
  needsElevatedLimitRole,
  normalizeMapsQueryParams,
  queryRandom,
  setCacheControl
} from '@allmaps/api-shared'

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

const createManifestBodySchema = t.Union([
  t.Object({ url: t.String() }),
  t.Array(t.Object({ url: t.String() }))
])

type CreateManifestBody = { url: string } | { url: string }[]

async function createManifestsFromBody(db: Db, body: CreateManifestBody) {
  if (Array.isArray(body)) {
    return Promise.all(body.map(({ url }) => createManifestFromUrl(db, url)))
  }

  return createManifestFromUrl(db, body.url)
}

export function createManifestsRoutes(
  env: RestEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({ name: 'manifests' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/manifests',
      async ({ db, env, query, set, getLimitRole }) => {
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(
          set,
          userRole === 'public' ? 'public-short' : 'private-no-store'
        )
        return queryManifests(
          env.PUBLIC_REST_BASE_URL,
          db,
          { georeferenced: query.georeferenced, limit: query.limit, userRole },
          { expectRows: false, singular: false }
        )
      },
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
      async ({ db, env, query, set, getLimitRole }) => {
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(set, 'private-no-store')
        return queryRandom((op, randomId) =>
          queryManifests(
            env.PUBLIC_REST_BASE_URL,
            db,
            {
              georeferenced: query.georeferenced,
              limit: query.limit,
              randomManifestId: randomId,
              randomManifestIdOp: op,
              userRole
            },
            { expectRows: true, singular: false }
          )
        )
      },
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
      async ({ db, params, env, query, set }) => {
        setCacheControl(set, 'public-medium')
        return queryManifests(
          env.PUBLIC_REST_BASE_URL,
          db,
          { manifestId: params.manifestId, georeferenced: query.georeferenced },
          { expectRows: true, singular: true }
        )
      },
      {
        params: t.Object({ manifestId: t.String() }),
        query: t.Object({ georeferenced: t.Optional(t.Boolean()) }),
        detail: { summary: 'Get a single IIIF Manifest', tags: ['Manifests'] }
      }
    )
    .get(
      '/manifests/:manifestId/maps',
      async ({ request, env, db, params, set, getLimitRole }) => {
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
          {
            ...queryParams,
            manifestId: params.manifestId,
            userRole
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
      async ({ request, env, db, params, set, getLimitRole }) => {
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
          {
            ...queryParams,
            manifestId: params.manifestId,
            userRole
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
    .post(
      '/manifests',
      ({ db, body, set }) => {
        setCacheControl(set, 'private-no-store')
        return createManifestsFromBody(db, body)
      },
      {
        admin: true,
        body: createManifestBodySchema,
        detail: {
          summary: 'Create a IIIF Manifest from a IIIF URL',
          tags: ['Manifests'],
          ...adminDetail
        }
      }
    )
    .put(
      '/manifests/:manifestId',
      async ({ db, params, body, set }) => {
        setCacheControl(set, 'private-no-store')
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
}
