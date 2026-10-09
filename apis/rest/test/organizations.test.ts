import { Elysia } from 'elysia'
import { describe, expect, test, vi } from 'vitest'

import type { Db } from '@allmaps/db'
import * as authSchema from '@allmaps/db/schema/auth'
import * as organizationsSchema from '@allmaps/db/schema/organizations'
import { updateOrganization } from '@allmaps/api-shared/db'

import { createOrganizationsRoutes } from '../src/routes/organizations.js'
import { createTestAuth, env, request, sessionForRole } from './helpers.js'

type Organization = typeof authSchema.organizations.$inferSelect
type OrganizationUrl = typeof organizationsSchema.organizationUrls.$inferSelect

function setup(plan: string | null = 'supporter', exists = true) {
  const state: {
    organization: Organization | undefined
    urls: OrganizationUrl[]
  } = {
    organization: exists
      ? ({
          id: 'organization-id',
          name: 'Original organization',
          slug: 'original-organization',
          logo: 'https://example.org/original.svg',
          homepage: 'https://example.org/original',
          plan,
          displayCollections: true,
          location: { type: 'Point', coordinates: [4.9, 52.4] },
          createdAt: new Date('2026-01-01'),
          metadata: null
        } satisfies Organization)
      : undefined,
    urls: [
      {
        organizationId: 'organization-id',
        type: 'domain',
        url: 'original.example.org'
      }
    ] as OrganizationUrl[]
  }
  const set = vi.fn((patch: Partial<Organization>) => {
    const values = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    )
    if (Object.keys(values).length === 0) {
      throw new Error('No values to set')
    }
    state.organization = { ...state.organization!, ...values }
    return {
      where: () => ({ returning: async () => [state.organization] })
    }
  })
  const update = vi.fn(() => ({ set }))
  const deleteUrls = vi.fn(async () => {
    state.urls = []
  })
  const db = {
    transaction: async <T>(callback: (transaction: unknown) => Promise<T>) =>
      callback(db),
    select: () => ({
      from: (table: unknown) => ({
        where: async () =>
          table === authSchema.organizations
            ? state.organization
              ? [{ ...state.organization }]
              : []
            : state.urls
      })
    }),
    update,
    delete: () => ({ where: deleteUrls }),
    insert: (table: unknown) => ({
      values: (values: Organization | OrganizationUrl[]) => {
        if (table === authSchema.organizations) {
          state.organization = { metadata: null, ...values } as Organization
          return { returning: async () => [state.organization] }
        }
        state.urls = values as OrganizationUrl[]
        return Promise.resolve()
      }
    })
  }
  const { betterAuth } = createTestAuth(sessionForRole('admin'))
  const app = new Elysia()
    .decorate('db', db as unknown as Db)
    .decorate('env', env)
    .use(createOrganizationsRoutes(env, betterAuth))

  return { app, db, state, set, update, deleteUrls }
}

describe('organization PATCH', () => {
  test.each(['contributor', 'supporter', 'innovator', null])(
    'a logo update preserves the existing plan %s and all omitted fields',
    async (plan) => {
      const { app, state, set, deleteUrls } = setup(plan)
      const before = structuredClone(state)
      const body = { logo: 'https://example.org/updated.svg' }
      const response = await app.handle(
        request('/organizations/organization-id', body, 'PATCH')
      )

      expect(response.status).toBe(200)
      expect(state).toEqual({
        ...before,
        organization: { ...before.organization, ...body }
      })
      expect(set).toHaveBeenCalledWith(body)
      expect(deleteUrls).not.toHaveBeenCalled()
      expect(await response.json()).toMatchObject({ ...body, plan })
    }
  )

  test.each([
    { name: 'Updated organization' },
    { slug: 'updated-organization' },
    { logo: 'https://example.org/updated.svg' },
    { homepage: 'https://example.org/updated' },
    { plan: 'contributor' },
    { displayCollections: false },
    { location: { type: 'Point', coordinates: [5.1, 52.1] } },
    { domains: ['updated.example.org'] }
  ])('updates only the supplied field: %j', async (body) => {
    const { app, state, set, update, deleteUrls } = setup()
    const before = structuredClone(state.organization)
    const previousUrls = structuredClone(state.urls)
    const response = await app.handle(
      request('/organizations/organization-id', body, 'PATCH')
    )
    const { domains, ...patch } = body

    expect(response.status).toBe(200)
    expect(state.organization).toEqual({ ...before, ...patch })
    if (domains === undefined) {
      expect(set).toHaveBeenCalledWith(patch)
      expect(state.urls).toEqual(previousUrls)
      expect(deleteUrls).not.toHaveBeenCalled()
    } else {
      expect(update).not.toHaveBeenCalled()
      expect(state.urls.map(({ url }) => url)).toEqual(domains)
    }
  })

  test.each(['logo', 'homepage', 'plan', 'location'])(
    'explicit null clears %s while preserving other fields',
    async (field) => {
      const { app, state, set } = setup()
      const before = structuredClone(state)
      const body = { [field]: null }
      const response = await app.handle(
        request('/organizations/organization-id', body, 'PATCH')
      )

      expect(response.status).toBe(200)
      expect(state).toEqual({
        ...before,
        organization: { ...before.organization, ...body }
      })
      expect(set).toHaveBeenCalledWith(body)
    }
  )

  test('an empty domains array clears domains without updating columns', async () => {
    const { app, state, update } = setup()
    const before = structuredClone(state.organization)
    const response = await app.handle(
      request('/organizations/organization-id', { domains: [] }, 'PATCH')
    )

    expect(response.status).toBe(200)
    expect(state.organization).toEqual(before)
    expect(state.urls).toEqual([])
    expect(update).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ domains: [] })
  })

  test('multi-field updates normalize only the supplied fields', async () => {
    const { app, state, set } = setup()
    const before = structuredClone(state.organization)
    const response = await app.handle(
      request(
        '/organizations/organization-id',
        {
          slug: ' updated-organization ',
          homepage: 'https://updated.example.org',
          displayCollections: false,
          domains: ['UPDATED.example.org', 'updated.example.org']
        },
        'PATCH'
      )
    )
    const patch = {
      slug: 'updated-organization',
      homepage: 'https://updated.example.org/',
      displayCollections: false
    }

    expect(response.status).toBe(200)
    expect(set).toHaveBeenCalledWith(patch)
    expect(state.organization).toEqual({ ...before, ...patch })
    expect(state.urls.map(({ url }) => url)).toEqual(['updated.example.org'])
  })

  test('an empty PATCH is a no-op', async () => {
    const { app, state, update, deleteUrls } = setup()
    const before = structuredClone(state)
    const response = await app.handle(
      request('/organizations/organization-id', {}, 'PATCH')
    )

    expect(response.status).toBe(200)
    expect(state).toEqual(before)
    expect(update).not.toHaveBeenCalled()
    expect(deleteUrls).not.toHaveBeenCalled()
  })

  test('the database helper also skips undefined-only patches', async () => {
    const { db, state, update } = setup()
    const before = structuredClone(state)
    await updateOrganization(
      db as unknown as Db,
      env.PUBLIC_REST_BASE_URL,
      'organization-id',
      { logo: undefined }
    )

    expect(state).toEqual(before)
    expect(update).not.toHaveBeenCalled()
  })

  test.each([{}, { domains: [] }, { logo: null }])(
    'missing organizations return 404 for %j',
    async (body) => {
      const { app, update, deleteUrls } = setup('supporter', false)
      const response = await app.handle(
        request('/organizations/missing', body, 'PATCH')
      )

      expect(response.status).toBe(404)
      expect(update).not.toHaveBeenCalled()
      expect(deleteUrls).not.toHaveBeenCalled()
    }
  )

  test('invalid plans are rejected before any write', async () => {
    const { app, state, update, deleteUrls } = setup()
    const before = structuredClone(state)
    const response = await app.handle(
      request('/organizations/organization-id', { plan: 'invalid' }, 'PATCH')
    )

    expect(response.status).toBe(422)
    expect(state).toEqual(before)
    expect(update).not.toHaveBeenCalled()
    expect(deleteUrls).not.toHaveBeenCalled()
  })
})

describe('organization creation', () => {
  test.each([
    [{}, 'contributor'],
    [{ plan: null }, null],
    [{ plan: 'contributor' }, 'contributor'],
    [{ plan: 'supporter' }, 'supporter'],
    [{ plan: 'innovator' }, 'innovator']
  ] as const)(
    'applies the creation default only when omitted: %j',
    async (body, plan) => {
      const { app, state } = setup(null, false)
      const response = await app.handle(
        request('/organizations', {
          name: 'New organization',
          slug: 'new-organization',
          ...body
        })
      )

      expect(response.status).toBe(200)
      expect(state.organization?.plan).toBe(plan)
      expect(await response.json()).toMatchObject({ plan })
    }
  )
})
