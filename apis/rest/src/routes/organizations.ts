import { t } from 'elysia'

import {
  normalizeDomains,
  listOrganizations,
  queryOrganizationByIdOrSlug,
  createOrganization,
  updateOrganization,
  deleteOrganization
} from '@allmaps/api-shared/db'

import { createElysia } from '../elysia.js'
import { betterAuthPlugin } from './auth.js'

const OrgBody = t.Object({
  name: t.String(),
  slug: t.String(),
  logo: t.Optional(t.Nullable(t.String())),
  homepage: t.Optional(t.Nullable(t.String())),
  plan: t.Optional(t.Nullable(t.UnionEnum(['supporter', 'innovator']))),
  domains: t.Optional(t.Array(t.String()))
})

export const organizations = createElysia({ name: 'organizations' })
  .use(betterAuthPlugin)
  .get('/organizations', async ({ db }) => listOrganizations(db), {
    detail: { summary: 'List all organizations', tags: ['Organizations'] }
  })
  .get(
    '/organizations/:organizationId',
    async ({ db, params, status }) => {
      const organization = await queryOrganizationByIdOrSlug(
        db,
        params.organizationId
      )

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
  .post(
    '/organizations',
    async ({ db, body, status }) => {
      const { validDomains, invalidDomains } = normalizeDomains(body.domains)
      if (invalidDomains.length > 0) {
        return status(400, {
          error: 'Invalid domains',
          domains: invalidDomains
        })
      }

      const org = await createOrganization(db, {
        ...body,
        domains: validDomains
      })

      if (!org) {
        return status(409, { error: 'Slug already in use' })
      }

      return org
    },
    {
      admin: true,
      body: OrgBody,
      detail: { summary: 'Create an organization', tags: ['Organizations'] }
    }
  )
  .patch(
    '/organizations/:organizationId',
    async ({ db, params, body, status }) => {
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
        params.organizationId,
        patch,
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
      body: t.Partial(OrgBody),
      detail: { summary: 'Update an organization', tags: ['Organizations'] }
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
      detail: { summary: 'Delete an organization', tags: ['Organizations'] }
    }
  )
