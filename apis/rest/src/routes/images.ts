import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import { createAuth } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import {
  queryImage,
  queryImages,
  createImage,
  queryMaps,
  queryImageChecksums
} from '@allmaps/api-shared/db'
import {
  needsElevatedLimitRole,
  normalizeMapsQueryParams,
  queryRandom,
  setCacheControl
} from '@allmaps/api-shared'

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
  maxArea: t.Optional(t.Number()),
  modifiedAfter: t.Optional(t.String()),
  modifiedBefore: t.Optional(t.String())
})

export function createImagesRoutes(
  env: RestEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({ name: 'images' })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/images',
      async ({ env, db, query, set, getLimitRole }) => {
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(
          set,
          userRole === 'public' ? 'public-short' : 'private-no-store'
        )
        return queryImages(
          env.PUBLIC_REST_BASE_URL,
          db,
          { georeferenced: query.georeferenced, limit: query.limit, userRole },
          { expectRows: false, singular: false }
        )
      },
      {
        query: imagesQuerySchema,
        detail: { summary: 'Get IIIF Images', tags: ['Images'] }
      }
    )
    .get(
      '/images/random',
      async ({ env, db, query, set, getLimitRole }) => {
        const userRole = needsElevatedLimitRole(query.limit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(set, 'private-no-store')
        return queryRandom((op, randomId) =>
          queryImages(
            env.PUBLIC_REST_BASE_URL,
            db,
            {
              georeferenced: query.georeferenced,
              limit: query.limit,
              randomImageId: randomId,
              randomImageIdOp: op,
              userRole
            },
            { expectRows: true, singular: false }
          )
        )
      },
      {
        query: imagesQuerySchema,
        detail: { summary: 'Get a random IIIF Image', tags: ['Images'] }
      }
    )
    .get(
      '/images/:imageId',
      ({ env, db, params, set }) => {
        setCacheControl(set, 'public-medium')
        return queryImage(env.PUBLIC_REST_BASE_URL, db, params.imageId)
      },
      {
        params: t.Object({ imageId: t.String() }),
        detail: { summary: 'Get a single IIIF Image', tags: ['Images'] }
      }
    )
    .get(
      '/images/:imageId/versions',
      ({ env, db, params, set }) => {
        setCacheControl(set, 'public-medium')
        return queryImageChecksums(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          params.imageId
        )
      },
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
            imageId: params.imageId,
            userRole
          },
          { format: 'map', expectRows: true, singular: false }
        )
      },
      {
        params: t.Object({ imageId: t.String() }),
        query: mapsQuerySchema,
        detail: {
          summary: 'Get maps for a single IIIF Image',
          tags: ['Images']
        }
      }
    )
    .get(
      '/images/:imageId/maps.geojson',
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
            imageId: params.imageId,
            userRole
          },
          { format: 'geojson', expectRows: true, singular: false }
        )
      },
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
      ({ db, params, body, set }) => {
        setCacheControl(set, 'private-no-store')
        return createImage(db, params.imageId, body.url)
      },
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
}
