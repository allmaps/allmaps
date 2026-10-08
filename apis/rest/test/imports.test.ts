import { Elysia } from 'elysia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  createImageFromUrl,
  createManifestFromUrl,
  queryImages,
  queryOrganizationById,
  queryOrganizationIdsByUserId,
  listOrganizations,
  listOrganizationsWithUsersByOrganizationIds,
  queryUserWithOrganizationsById,
  queryUsers,
  queryListWithItems,
  addItemToList
} from '@allmaps/api-shared/db'

import { createImagesRoutes } from '../src/routes/images.js'
import { createManifestsRoutes } from '../src/routes/manifests.js'
import { createOrganizationsRoutes } from '../src/routes/organizations.js'
import { createAuthRoutes } from '../src/routes/auth.js'
import { createListsRoutes } from '../src/routes/lists.js'
import {
  createMembershipDb,
  createTestAuth,
  env,
  request,
  sessionForRole
} from './helpers.js'

vi.mock('@allmaps/api-shared/db', () => ({
  createImageFromUrl: vi.fn(async (_db, url) => ({ id: 'image-id', uri: url })),
  createManifestFromUrl: vi.fn(async (_db, url) => ({
    id: 'manifest-id',
    uri: url
  })),
  createImage: vi.fn(),
  createManifest: vi.fn(),
  queryImage: vi.fn(),
  queryImages: vi.fn(),
  queryRandomImagesByOrganizationIds: vi.fn(),
  queryManifests: vi.fn(),
  queryCanvases: vi.fn(),
  queryMaps: vi.fn(),
  queryImageChecksums: vi.fn(),
  normalizeOrganizationSlug: vi.fn(),
  normalizeHomepageUrl: vi.fn(),
  normalizeDomains: vi.fn(),
  normalizeOrganizationLocation: vi.fn(),
  listOrganizations: vi.fn(async () => []),
  listOrganizationsWithUsers: vi.fn(),
  listOrganizationsWithUsersByOrganizationIds: vi.fn(async () => []),
  queryOrganizationById: vi.fn(async () => ({
    id: 'organization-id',
    domains: ['iiif.example']
  })),
  queryOrganizationByIdWithUsers: vi.fn(),
  queryOrganizationIdsByUserId: vi.fn(async () => []),
  queryOrganizationMemberByUserId: vi.fn(),
  createOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  queryAdminOrganizationById: vi.fn(),
  queryUserWithOrganizationsById: vi.fn(async () => ({ id: 'user-id' })),
  queryOrganizationMembersById: vi.fn(),
  queryUserById: vi.fn(),
  queryUserByEmail: vi.fn(),
  queryUsers: vi.fn(),
  queryUserLists: vi.fn(),
  createUserList: vi.fn(),
  queryListWithItems: vi.fn(async () => undefined),
  updateUserListName: vi.fn(),
  addItemToList: vi.fn(),
  addItemToListByUrl: vi.fn(),
  deleteListItem: vi.fn(),
  deleteUserList: vi.fn()
}))

beforeEach(() => vi.clearAllMocks())

function setup(role: string | null, plan: string | null = null) {
  const db = createMembershipDb(plan)
  const { betterAuth, getSession } = createTestAuth(
    role === null ? null : sessionForRole(role)
  )
  const app = new Elysia()
    .decorate('db', db)
    .decorate('env', env)
    .use(createImagesRoutes(env, betterAuth))
    .use(createManifestsRoutes(env, betterAuth))
    .use(createOrganizationsRoutes(env, betterAuth))
    .use(createAuthRoutes(env, betterAuth))
    .use(createListsRoutes(betterAuth))
  return { app, db, getSession }
}

describe.each([
  ['images', createImageFromUrl],
  ['manifests', createManifestFromUrl]
] as const)('%s import endpoint', (resource, create) => {
  test.each(['collaborator', 'admin'])(
    '%s can import one resource or a batch from any institution',
    async (role) => {
      const { app, db } = setup(role)
      const url = 'https://other-institution.example/iiif/resource'
      const single = await app.handle(request(`/${resource}`, { url }))
      expect(single.status).toBe(200)
      expect(single.headers.get('Cache-Control')).toBe('private, no-store')
      expect(create).toHaveBeenCalledWith(db, url)
      const batch = await app.handle(
        request(`/${resource}`, [{ url }, { url: `${url}/second` }])
      )
      expect(batch.status).toBe(200)
      expect(await batch.json()).toHaveLength(2)
      expect(create).toHaveBeenCalledTimes(3)
    }
  )

  test.each([
    [null, 401],
    ['user', 403]
  ] as const)('%s cannot import', async (role, status) => {
    const { app } = setup(role)
    const response = await app.handle(
      request(`/${resource}`, { url: 'https://iiif.example/resource' })
    )
    expect(response.status).toBe(status)
    expect(create).not.toHaveBeenCalled()
  })

  test('collaborator organization membership preserves domain restrictions', async () => {
    const { app, db, getSession } = setup('collaborator', 'supporter')
    const url = 'https://iiif.example/resource'
    const response = await app.handle(
      request(`/organizations/organization-id/${resource}`, { url })
    )
    expect(response.status).toBe(200)
    expect(create).toHaveBeenCalledWith(db, url, {
      allowedUrlDomains: ['iiif.example'],
      ...(resource === 'images'
        ? { allowedParsedUriDomains: ['iiif.example'] }
        : {})
    })
    expect(getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    )
  })

  test('collaborator without a qualifying membership cannot use organization import', async () => {
    const { app } = setup('collaborator')
    expect(
      (
        await app.handle(
          request(`/organizations/organization-id/${resource}`, {
            url: 'https://iiif.example/resource'
          })
        )
      ).status
    ).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })

  test('ordinary organization-plan members retain import access', async () => {
    const { app } = setup('user', 'contributor')
    expect(
      (
        await app.handle(
          request(`/organizations/organization-id/${resource}`, {
            url: 'https://iiif.example/resource'
          })
        )
      ).status
    ).toBe(200)
  })

  test('missing organizations return 404', async () => {
    vi.mocked(queryOrganizationById).mockResolvedValueOnce(undefined)
    const { app } = setup('collaborator', 'supporter')
    expect(
      (
        await app.handle(
          request(`/organizations/missing/${resource}`, {
            url: 'https://iiif.example/resource'
          })
        )
      ).status
    ).toBe(404)
    expect(create).not.toHaveBeenCalled()
  })
})

test('a 1,000-result collaborator request returns a complete private response', async () => {
  const { queryImages: actualQueryImages } = await vi.importActual<
    typeof import('../../../packages/api-shared/src/queries/iiif.js')
  >('../../../packages/api-shared/src/queries/iiif.js')
  vi.mocked(queryImages).mockImplementationOnce(actualQueryImages)
  const images = Array.from({ length: 1200 }, (_, index) => ({
    id: `image-${index}`,
    uri: `https://iiif.example/image/${index}`,
    width: 1000,
    height: 1000,
    embedded: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    fetched: true,
    organizationUrl: null,
    maps: [],
    canvases: []
  }))
  const { app, db } = setup('collaborator')
  db.query.images.findMany.mockImplementationOnce(async ({ limit }) =>
    images.slice(0, limit)
  )
  const response = await app.handle(
    new Request('http://localhost/images?limit=1000')
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  const data = (await response.json()) as { id: string }[]
  expect(data).toHaveLength(1000)
  expect(data.at(-1)?.id).toBe(`${env.PUBLIC_REST_BASE_URL}/images/image-999`)
  expect(db.query.images.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ limit: 1000 })
  )
  expect(queryImages).toHaveBeenCalledWith(
    env.PUBLIC_REST_BASE_URL,
    expect.anything(),
    expect.objectContaining({ userRole: 'collaborator', limit: 1000 }),
    expect.anything()
  )
})

test('collaborator limits retain organization visibility filtering', async () => {
  vi.mocked(queryOrganizationIdsByUserId).mockResolvedValueOnce([
    'organization-id'
  ])
  const { app } = setup('collaborator')
  const response = await app.handle(
    new Request('http://localhost/organizations?limit=1000')
  )
  expect(response.status).toBe(200)
  expect(listOrganizationsWithUsersByOrganizationIds).toHaveBeenCalledWith(
    expect.anything(),
    env.PUBLIC_REST_BASE_URL,
    ['organization-id'],
    expect.objectContaining({ userRole: 'collaborator', limit: 1000 })
  )
  expect(listOrganizations).not.toHaveBeenCalled()
})

test('collaborators without memberships can list public organizations at their higher limit', async () => {
  const { app } = setup('collaborator')
  const response = await app.handle(
    new Request('http://localhost/organizations?limit=1000')
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(listOrganizations).toHaveBeenCalledWith(
    expect.anything(),
    env.PUBLIC_REST_BASE_URL,
    expect.objectContaining({ userRole: 'collaborator', limit: 1000 })
  )
})

test('collaborators cannot list users or access other users details', async () => {
  const { app } = setup('collaborator')
  expect((await app.handle(new Request('http://localhost/users'))).status).toBe(
    401
  )
  expect(
    (await app.handle(new Request('http://localhost/users/other-user'))).status
  ).toBe(401)
  expect(queryUsers).not.toHaveBeenCalled()
  expect(queryUserWithOrganizationsById).not.toHaveBeenCalled()
  expect(
    (await app.handle(new Request('http://localhost/users/user-id'))).status
  ).toBe(200)
})

test('collaborators cannot administer organizations', async () => {
  const { app } = setup('collaborator')
  const response = await app.handle(
    request('/organizations', { name: 'New', slug: 'new' })
  )
  expect(response.status).toBe(401)
})

test('collaborator list writes remain restricted to their own user ID', async () => {
  const { app, db } = setup('collaborator')
  const response = await app.handle(
    request('/lists/someone-elses-list/items', { imageId: 'image-id' })
  )
  expect(response.status).toBe(404)
  expect(queryListWithItems).toHaveBeenCalledWith(
    db,
    'user-id',
    'someone-elses-list'
  )
  expect(addItemToList).not.toHaveBeenCalled()
})
