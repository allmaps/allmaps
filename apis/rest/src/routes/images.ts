import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { Db } from '@allmaps/db'
import { createAuth } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { adminDetail } from '../openapi.js'
import {
  queryImage,
  queryImages,
  queryRandomImagesByOrganizationIds,
  createImage,
  createImageFromUrl,
  queryMaps,
  queryImageChecksums
} from '@allmaps/api-shared/db'
import {
  ResponseError,
  clampLimit,
  needsElevatedLimitRole,
  normalizeMapsQueryParams,
  queryRandom,
  setCacheControl
} from '@allmaps/api-shared'

const imagesQuerySchema = t.Object({
  georeferenced: t.Optional(t.Boolean()),
  limit: t.Optional(t.Number())
})

const randomImagesQuerySchema = t.Object({
  georeferenced: t.Optional(t.Boolean()),
  limit: t.Optional(t.Number()),
  organizationId: t.Optional(t.Array(t.String())),
  limitPerOrganization: t.Optional(t.Integer({ minimum: 1 }))
})

const createImageBodySchema = t.Union([
  t.Object({ url: t.String() }),
  t.Array(t.Object({ url: t.String() }))
])

type CreateImageBody = { url: string } | { url: string }[]

const mapsQuerySchema = t.Object({
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

async function createImagesFromBody(db: Db, body: CreateImageBody) {
  if (Array.isArray(body)) {
    return Promise.all(body.map(({ url }) => createImageFromUrl(db, url)))
  }

  return createImageFromUrl(db, body.url)
}

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
        const organizationIds = [...new Set(query.organizationId ?? [])]
        const hasOrganizations = organizationIds.length > 0

        if (hasOrganizations && query.limit !== undefined) {
          throw new ResponseError(
            'limit cannot be combined with organizationId',
            400
          )
        }

        if (!hasOrganizations && query.limitPerOrganization !== undefined) {
          throw new ResponseError(
            'limitPerOrganization requires organizationId',
            400
          )
        }

        const requestedLimitPerOrganization = query.limitPerOrganization ?? 1
        const requestedLimit = hasOrganizations
          ? organizationIds.length * requestedLimitPerOrganization
          : query.limit
        const userRole = needsElevatedLimitRole(requestedLimit)
          ? await getLimitRole()
          : 'public'
        setCacheControl(set, 'private-no-store')

        if (hasOrganizations) {
          const totalLimit = clampLimit(requestedLimit, userRole)
          const limitPerOrganization = Math.floor(
            totalLimit / organizationIds.length
          )

          if (limitPerOrganization < 1) {
            throw new ResponseError('Too many organizationId parameters', 400)
          }

          return queryRandomImagesByOrganizationIds(
            env.PUBLIC_REST_BASE_URL,
            db,
            {
              organizationIds,
              georeferenced: query.georeferenced,
              limitPerOrganization,
              userRole
            }
          )
        }

        const limit = clampLimit(query.limit ?? 100, userRole)
        return queryRandom(
          limit,
          async (op, randomId, queryLimit) => {
            const images = await queryImages(
              env.PUBLIC_REST_BASE_URL,
              db,
              {
                georeferenced: query.georeferenced,
                limit: queryLimit,
                randomImageId: randomId,
                randomImageIdOp: op,
                userRole
              },
              { expectRows: false, singular: false }
            )

            return Array.isArray(images) ? images : [images]
          },
          'Images not found'
        )
      },
      {
        query: randomImagesQuerySchema,
        detail: { summary: 'Get random IIIF Images', tags: ['Images'] }
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
      ({ request, env, db, params, set }) => {
        const queryParams = normalizeMapsQueryParams(request)
        setCacheControl(set, 'public-medium')
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            ...queryParams,
            imageId: params.imageId
          },
          {
            format: 'map',
            expectRows: true,
            singular: false,
            resultScope: 'complete'
          }
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
      ({ request, env, db, params, set }) => {
        const queryParams = normalizeMapsQueryParams(request)
        setCacheControl(set, 'public-medium')
        return queryMaps(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          {
            ...queryParams,
            imageId: params.imageId
          },
          {
            format: 'geojson',
            expectRows: true,
            singular: false,
            resultScope: 'complete'
          }
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
    .post(
      '/images',
      ({ db, body, set }) => {
        setCacheControl(set, 'private-no-store')
        return createImagesFromBody(db, body)
      },
      {
        admin: true,
        body: createImageBodySchema,
        detail: {
          summary: 'Create a single IIIF Image from a IIIF URL',
          tags: ['Images'],
          ...adminDetail
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
