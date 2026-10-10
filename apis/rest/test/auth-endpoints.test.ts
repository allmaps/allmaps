import { Elysia } from 'elysia'
import { createBetterAuthRoutes } from '@allmaps/api-shared/elysia'
import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { createAuth } from '@allmaps/db/auth'

const { auth: configuredAuth } = createAuth({
  DATABASE_URL: 'postgresql://test:test@database.example/allmaps',
  BETTER_AUTH_URL: 'https://api.example',
  BETTER_AUTH_SECRET: 'test-secret-with-at-least-thirty-two-characters',
  BETTER_AUTH_COOKIE_PREFIX: 'test',
  GITHUB_CLIENT_ID: 'test',
  GITHUB_CLIENT_SECRET: 'test'
})

// Run the production plugin configuration against an isolated in-memory store.
const authOptions = {
  ...configuredAuth.options,
  secret: 'test-secret-with-at-least-thirty-two-characters',
  advanced: {
    ...configuredAuth.options.advanced,
    // Better Auth skips origin checks in test mode unless explicitly enabled.
    disableOriginCheck: false,
    disableCSRFCheck: false
  },
  database: memoryAdapter({
    user: [],
    session: [],
    account: [],
    verification: [],
    organization: [],
    member: [],
    invitation: []
  }),
  // The Starred-list hook uses the application's SQL database.
  databaseHooks: { user: { create: { after: async () => undefined } } },
  emailAndPassword: { enabled: true }
}
const auth = betterAuth<typeof configuredAuth.options>(authOptions)
let cookie: string
let adminId: string
let targetId: string
let collaboratorCookie: string

beforeAll(async () => {
  // Trusted server calls seed fixtures; all assertions go through the HTTP handler.
  const admin = await auth.api.createUser({
    body: {
      email: 'admin@example.org',
      name: 'Admin',
      role: 'admin',
      password: 'test-password-123'
    }
  })
  adminId = admin.user.id
  const target = await auth.api.createUser({
    body: {
      email: 'target@example.org',
      name: 'Target',
      role: 'user'
    }
  })
  targetId = target.user.id
  const response = await auth.api.signInEmail({
    body: {
      email: 'admin@example.org',
      password: 'test-password-123'
    },
    asResponse: true
  })
  cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  expect(cookie).toContain('session_token')
  await auth.api.createUser({
    body: {
      email: 'collaborator@example.org',
      name: 'Collaborator',
      role: 'collaborator',
      password: 'test-password-123'
    }
  })
  const collaborator = await auth.api.signInEmail({
    body: { email: 'collaborator@example.org', password: 'test-password-123' },
    asResponse: true
  })
  collaboratorCookie = collaborator.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
})

function post(path: string, body: unknown, sessionCookie = cookie) {
  return auth.handler(
    new Request(`https://api.example/auth${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: sessionCookie,
        origin: 'https://api.example'
      },
      body: JSON.stringify(body)
    })
  )
}

describe('database-only Admin and disabled generic role writes', () => {
  test('the set-role HTTP endpoint is disabled even for Allmaps admins', async () => {
    expect(
      (await post('/admin/set-role', { userId: targetId, role: 'admin' }))
        .status
    ).toBe(404)
  })
  test.each(['admin', 'collaborator', 'user'])(
    'update-user cannot write role %s, including demoting an Allmaps admin',
    async (role) => {
      expect(
        (await post('/admin/update-user', { userId: targetId, data: { role } }))
          .status
      ).toBe(403)
      expect(
        (await post('/admin/update-user', { userId: adminId, data: { role } }))
          .status
      ).toBe(403)
    }
  )
  test.each([{ role: 'admin' }, { data: { role: 'admin' } }])(
    'create-user cannot assign admin through %j',
    async (role) => {
      expect(
        (
          await post('/admin/create-user', {
            name: 'New user',
            email: 'new@example.org',
            ...role
          })
        ).status
      ).toBe(403)
    }
  )
  test('Allmaps admins cannot delete accounts and bypass owner protection', async () => {
    const response = await post('/admin/remove-user', { userId: targetId })
    expect(response.status).toBe(403)
    expect(
      await auth.api.getUser({
        query: { id: targetId },
        headers: new Headers({ cookie })
      })
    ).toMatchObject({ id: targetId })
  })
  test('Allmaps admins can still update ordinary profile fields', async () => {
    const response = await post('/admin/update-user', {
      userId: targetId,
      data: { name: 'Updated name' }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      name: 'Updated name',
      role: 'user'
    })
  })
})

test.each([
  '/organization/create',
  '/organization/update',
  '/organization/delete',
  '/organization/update-member-role',
  '/organization/remove-member',
  '/organization/leave',
  '/organization/invite-member',
  '/organization/cancel-invitation',
  '/organization/accept-invitation',
  '/organization/reject-invitation'
])('built-in write endpoint %s cannot bypass the REST policy', async (path) => {
  const response = await post(path, {
    organizationId: 'organization-id',
    role: 'owner',
    data: { plan: 'innovator' }
  })
  expect(response.status).toBe(404)
})

test('collaborators may edit their own basic profile without changing their role', async () => {
  const response = await post(
    '/update-user',
    { name: 'Updated collaborator', slug: 'updated-collaborator' },
    collaboratorCookie
  )
  expect(response.status).toBe(200)
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: collaboratorCookie }),
    query: { disableCookieCache: true }
  })
  expect(session?.user).toMatchObject({
    name: 'Updated collaborator',
    slug: 'updated-collaborator',
    role: 'collaborator'
  })
})
test.each([
  [
    '/admin/update-user',
    () => ({ userId: targetId, data: { name: 'Forbidden' } })
  ],
  ['/admin/remove-user', () => ({ userId: targetId })],
  ['/admin/ban-user', () => ({ userId: targetId })]
] as const)(
  'collaborators cannot modify accounts through %s',
  async (path, body) => {
    expect((await post(path, body(), collaboratorCookie)).status).toBe(403)
  }
)
test.each(['admin', 'user'])(
  'self-profile writes cannot change global role to %s',
  async (role) => {
    await post(
      '/update-user',
      { name: 'Collaborator', role },
      collaboratorCookie
    )
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: collaboratorCookie }),
      query: { disableCookieCache: true }
    })
    expect(session?.user.role).toBe('collaborator')
  }
)

describe('login and logout routes', () => {
  const app = new Elysia().use(
    createBetterAuthRoutes({ auth, baseURL: 'https://api.example' })
  )

  test('GitHub login redirects and forwards the OAuth state cookie', async () => {
    const response = await app.handle(
      new Request(
        'http://localhost/login/github?returnTo=https://api.example/profile'
      )
    )
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe('https://github.com')
    expect(location.pathname).toBe('/login/oauth/authorize')
    expect(location.searchParams.get('client_id')).toBe('test')
    expect(location.searchParams.get('state')).toBeTruthy()
    expect(response.headers.get('set-cookie')).toBeTruthy()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  test('GitHub login rejects an untrusted callback URL through Better Auth', async () => {
    const response = await app.handle(
      new Request(
        'http://localhost/login/github?returnTo=https://untrusted.example/profile'
      )
    )
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(await response.json()).toEqual({
      error: 'Failed to get GitHub OAuth URL'
    })
  })

  test.each([undefined, 'origin', 'referer'] as const)(
    'logout revokes the session with %s and forwards expired cookies',
    async (originHeader) => {
      const login = await auth.api.signInEmail({
        body: { email: 'admin@example.org', password: 'test-password-123' },
        asResponse: true
      })
      const headers = new Headers({
        cookie: login.headers
          .getSetCookie()
          .map((value) => value.split(';')[0])
          .join('; ')
      })
      if (originHeader) headers.set(originHeader, 'https://api.example')
      expect(
        await auth.api.getSession({
          headers,
          query: { disableCookieCache: true }
        })
      ).not.toBeNull()
      const response = await app.handle(
        new Request('http://localhost/logout?returnTo=/signed-out', { headers })
      )
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('/signed-out')
      expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
      expect(response.headers.get('cache-control')).toContain('no-store')
      expect(
        await auth.api.getSession({
          headers,
          query: { disableCookieCache: true }
        })
      ).toBeNull()
    }
  )

  test('logout does not redirect when Better Auth returns an error', async () => {
    const signOut = vi
      .spyOn(auth.api, 'signOut')
      .mockImplementationOnce(
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ error: 'Sign out unavailable' }, { status: 503 })
          )
      )
    try {
      const response = await app.handle(
        new Request('http://localhost/logout?returnTo=/signed-out')
      )
      expect(response.status).toBe(503)
      expect(response.headers.get('location')).toBeNull()
    } finally {
      signOut.mockRestore()
    }
  })
})
