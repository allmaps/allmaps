import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import { createAuth } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'
import {
  normalizeOrganizationSlug,
  normalizeDomains,
  listOrganizations,
  listOrganizationsWithUsers,
  queryOrganizationById,
  queryOrganizationByIdWithUsers,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  queryImages,
  queryCanvases,
  queryManifests
} from '@allmaps/api-shared/db'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { adminDetail } from '../openapi.js'

const OrganizationBody = t.Object({
  name: t.String(),
  slug: t.String(),
  logo: t.Optional(t.Nullable(t.String())),
  homepage: t.Optional(t.Nullable(t.String())),
  plan: t.Optional(t.Nullable(t.UnionEnum(['supporter', 'innovator']))),
  domains: t.Optional(t.Array(t.String()))
})

const querySchema = t.Object({
  georeferenced: t.Optional(t.Boolean()),
  limit: t.Optional(t.Number())
})

export function createOrganizationsRoutes(
  env: RestEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  const { auth } = betterAuth

  return createElysia({
    name: 'organizations-routes'
  })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/organizations',
      async ({ db, env, query, request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (session?.user.role === 'admin') {
          return listOrganizationsWithUsers(
            db,
            env.PUBLIC_REST_BASE_URL,
            query.limit
          )
        }

        return listOrganizations(db, env.PUBLIC_REST_BASE_URL, query.limit)
      },
      {
        query: t.Object({ limit: t.Optional(t.Number()) }),
        detail: { summary: 'Get all organizations', tags: ['Organizations'] }
      }
    )
    .get(
      '/organizations/:organizationId',
      async ({ db, env, params, status, request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        let organization

        if (session?.user.role === 'admin') {
          organization = await queryOrganizationByIdWithUsers(
            db,
            env.PUBLIC_REST_BASE_URL,
            params.organizationId
          )
        } else {
          organization = await queryOrganizationById(
            db,
            env.PUBLIC_REST_BASE_URL,
            params.organizationId
          )
        }

        if (!organization) {
          return status(404, { error: 'Organization not found' })
        }

        return organization
      },
      {
        params: t.Object({ organizationId: t.String() }),
        detail: { summary: 'Get an organization', tags: ['Organizations'] }
      }
    )
    .get(
      '/organizations/:organizationId/manifests',
      ({ env, db, params, query }) =>
        queryManifests(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            organizationId: params.organizationId,
            georeferenced: query.georeferenced,
            limit: query.limit
          },
          { expectRows: false, singular: false }
        ),
      {
        query: querySchema,
        detail: {
          summary: 'Get IIIF Manifests for a single organization',
          tags: ['Organizations']
        }
      }
    )
    .get(
      '/organizations/:organizationId/canvases',
      ({ env, db, params, query }) =>
        queryCanvases(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            organizationId: params.organizationId,
            georeferenced: query.georeferenced,
            limit: query.limit
          },
          { expectRows: false, singular: false }
        ),
      {
        query: querySchema,
        detail: {
          summary: 'Get IIIF Canvases for a single organization',
          tags: ['Organizations']
        }
      }
    )
    .get(
      '/organizations/:organizationId/images',
      ({ env, db, params, query }) =>
        queryImages(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            organizationId: params.organizationId,
            georeferenced: query.georeferenced,
            limit: query.limit
          },
          { expectRows: false, singular: false }
        ),
      {
        query: querySchema,
        detail: {
          summary: 'Get IIIF Images for a single organization',
          tags: ['Organizations']
        }
      }
    )
    .post(
      '/organizations',
      async ({ db, env, body, status }) => {
        const validSlug = normalizeOrganizationSlug(body.slug)
        if (!validSlug) {
          return status(400, {
            error:
              'Invalid slug. Use lowercase letters, numbers, and hyphens, starting with a letter.'
          })
        }

        const { validDomains, invalidDomains } = normalizeDomains(body.domains)
        if (invalidDomains.length > 0) {
          return status(400, {
            error: 'Invalid domains',
            domains: invalidDomains
          })
        }

        const organization = await createOrganization(
          db,
          env.PUBLIC_REST_BASE_URL,
          {
            ...body,
            slug: validSlug,
            domains: validDomains
          }
        )

        if (!organization) {
          return status(409, { error: 'Slug already in use' })
        }

        return organization
      },
      {
        admin: true,
        body: OrganizationBody,
        detail: {
          summary: 'Create an organization',
          tags: ['Organizations'],
          ...adminDetail
        }
      }
    )
    .patch(
      '/organizations/:organizationId',
      async ({ db, env, params, body, status }) => {
        const validSlug =
          body.slug === undefined
            ? undefined
            : normalizeOrganizationSlug(body.slug)

        if (body.slug !== undefined && !validSlug) {
          return status(400, {
            error:
              'Invalid slug. Use lowercase letters, numbers, and hyphens, starting with a letter.'
          })
        }

        const { validDomains, invalidDomains } = normalizeDomains(body.domains)
        if (invalidDomains.length > 0) {
          return status(400, {
            error: 'Invalid domains',
            domains: invalidDomains
          })
        }

        const { domains, ...patch } = body
        const organization = await updateOrganization(
          db,
          env.PUBLIC_REST_BASE_URL,
          params.organizationId,
          {
            ...patch,
            ...(validSlug !== undefined ? { slug: validSlug } : {})
          },
          domains !== undefined ? validDomains : undefined
        )
        if (!organization) {
          return status(404, { error: 'Organization not found' })
        }

        return organization
      },
      {
        admin: true,
        params: t.Object({ organizationId: t.String() }),
        body: t.Partial(OrganizationBody),
        detail: {
          summary: 'Update an organization',
          tags: ['Organizations'],
          ...adminDetail
        }
      }
    )
    .delete(
      '/organizations/:organizationId',
      async ({ db, params, status }) => {
        const deleted = await deleteOrganization(db, params.organizationId)

        if (!deleted) {
          return status(404, { error: 'Organization not found' })
        }

        return { success: true }
      },
      {
        admin: true,
        params: t.Object({ organizationId: t.String() }),
        detail: {
          summary: 'Delete an organization',
          tags: ['Organizations'],
          ...adminDetail
        }
      }
    )
}
