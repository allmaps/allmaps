import { t } from 'elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import { createAuth } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'
import {
  normalizeOrganizationSlug,
  normalizeHomepageUrl,
  normalizeDomains,
  listOrganizations,
  listOrganizationsWithUsers,
  listOrganizationsWithUsersByOrganizationIds,
  queryOrganizationById,
  queryOrganizationByIdWithUsers,
  queryOrganizationIdsByUserId,
  queryOrganizationMemberByUserId,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  queryImages,
  queryCanvases,
  queryManifests
} from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'

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
      async ({ db, env, query, request, set }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (session?.user.role === 'admin') {
          setCacheControl(set, 'private-no-store')
          return listOrganizationsWithUsers(
            db,
            env.PUBLIC_REST_BASE_URL,
            query.limit
          )
        }

        if (session?.user.id) {
          const organizationIds = await queryOrganizationIdsByUserId(
            db,
            session.user.id
          )

          if (organizationIds.length > 0) {
            setCacheControl(set, 'private-no-store')
            return listOrganizationsWithUsersByOrganizationIds(
              db,
              env.PUBLIC_REST_BASE_URL,
              organizationIds,
              query.limit,
              'user'
            )
          }
        }

        setCacheControl(set, 'public-medium')
        return listOrganizations(db, env.PUBLIC_REST_BASE_URL, query.limit)
      },
      {
        query: t.Object({ limit: t.Optional(t.Number()) }),
        detail: { summary: 'Get all organizations', tags: ['Organizations'] }
      }
    )
    .get(
      '/organizations/:organizationId',
      async ({ db, env, params, status, request, set }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        let organization

        if (session?.user.role === 'admin') {
          setCacheControl(set, 'private-no-store')
          organization = await queryOrganizationByIdWithUsers(
            db,
            env.PUBLIC_REST_BASE_URL,
            params.organizationId
          )
        } else if (session?.user.id) {
          const member = await queryOrganizationMemberByUserId(
            db,
            params.organizationId,
            session.user.id
          )

          if (member) {
            setCacheControl(set, 'private-no-store')
            organization = await queryOrganizationByIdWithUsers(
              db,
              env.PUBLIC_REST_BASE_URL,
              params.organizationId
            )
          } else {
            setCacheControl(set, 'public-medium')
            organization = await queryOrganizationById(
              db,
              env.PUBLIC_REST_BASE_URL,
              params.organizationId
            )
          }
        } else {
          setCacheControl(set, 'public-medium')
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
      ({ env, db, params, query, set }) => {
        setCacheControl(set, 'public-short')
        return queryManifests(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            organizationId: params.organizationId,
            georeferenced: query.georeferenced,
            limit: query.limit
          },
          { expectRows: false, singular: false }
        )
      },
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
      ({ env, db, params, query, set }) => {
        setCacheControl(set, 'public-short')
        return queryCanvases(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            organizationId: params.organizationId,
            georeferenced: query.georeferenced,
            limit: query.limit
          },
          { expectRows: false, singular: false }
        )
      },
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
      ({ env, db, params, query, set }) => {
        setCacheControl(set, 'public-short')
        return queryImages(
          env.PUBLIC_REST_BASE_URL,
          db,
          {
            organizationId: params.organizationId,
            georeferenced: query.georeferenced,
            limit: query.limit
          },
          { expectRows: false, singular: false }
        )
      },
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
      async ({ db, env, body, status, set }) => {
        setCacheControl(set, 'private-no-store')
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

        const validHomepage =
          body.homepage === undefined || body.homepage === null
            ? body.homepage
            : normalizeHomepageUrl(body.homepage)

        if (
          body.homepage !== undefined &&
          body.homepage !== null &&
          !validHomepage
        ) {
          return status(400, {
            error: 'Invalid homepage. Use an absolute http(s) URL.'
          })
        }

        const organization = await createOrganization(
          db,
          env.PUBLIC_REST_BASE_URL,
          {
            ...body,
            homepage: validHomepage,
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
      async ({ db, env, params, body, status, set }) => {
        setCacheControl(set, 'private-no-store')
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

        const validHomepage =
          body.homepage === undefined || body.homepage === null
            ? body.homepage
            : normalizeHomepageUrl(body.homepage)

        if (
          body.homepage !== undefined &&
          body.homepage !== null &&
          !validHomepage
        ) {
          return status(400, {
            error: 'Invalid homepage. Use an absolute http(s) URL.'
          })
        }

        const { domains, ...patch } = body
        const organization = await updateOrganization(
          db,
          env.PUBLIC_REST_BASE_URL,
          params.organizationId,
          {
            ...patch,
            ...(body.homepage !== undefined ? { homepage: validHomepage } : {}),
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
      async ({ db, params, status, set }) => {
        setCacheControl(set, 'private-no-store')
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
