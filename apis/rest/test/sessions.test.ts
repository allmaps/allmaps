import { Elysia } from 'elysia'
import { expect, test } from 'vitest'

import { createBetterAuthPlugin } from '@allmaps/api-shared/elysia'
import { createTestAuth, sessionForRole } from './helpers.js'

test('composed guards and access helpers share one fresh session read', async () => {
  const { betterAuth, getSession } = createTestAuth(sessionForRole('admin'))
  const app = new Elysia().use(createBetterAuthPlugin(betterAuth)).get(
    '/',
    async ({
      user,
      getCurrentSession,
      getOrganizationAccess,
      getLimitRole
    }) => {
      const [session, access, role] = await Promise.all([
        getCurrentSession(),
        getOrganizationAccess('organization-id'),
        getLimitRole()
      ])
      return { userId: user.id, session, permissions: access.permissions, role }
    },
    { auth: true, organizationManager: true, importIiif: true, admin: true }
  )

  const response = await app.handle(new Request('http://localhost/'))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    userId: 'user-id',
    role: 'admin',
    permissions: { canManageMembers: true }
  })
  expect(getSession).toHaveBeenCalledTimes(1)
  expect(getSession).toHaveBeenCalledWith(
    expect.objectContaining({ query: { disableCookieCache: true } })
  )
})

test.each([null, sessionForRole('user')])(
  'a fresh session result supersedes the cookie cache: %j',
  async (currentSession) => {
    const { betterAuth, getSession } = createTestAuth(
      sessionForRole('admin'),
      currentSession
    )
    const app = new Elysia()
      .use(createBetterAuthPlugin(betterAuth))
      .get('/', async ({ getLimitRole, getCurrentSession }) => {
        const before = await getLimitRole()
        await Promise.all([getCurrentSession(), getCurrentSession()])
        return { before, after: await getLimitRole() }
      })

    const response = await app.handle(new Request('http://localhost/'))
    expect(await response.json()).toEqual({
      before: 'admin',
      after: currentSession ? 'user' : 'public'
    })
    expect(getSession).toHaveBeenCalledTimes(2)
    expect(getSession.mock.calls.map(([options]) => options.query)).toEqual([
      { disableCookieCache: false },
      { disableCookieCache: true }
    ])
  }
)

test.each([null, sessionForRole('user')])(
  'session reads are reused within a request and isolated between requests: %j',
  async (session) => {
    const { betterAuth, getSession } = createTestAuth(session)
    const app = new Elysia()
      .use(createBetterAuthPlugin(betterAuth))
      .get('/', async ({ getOptionalSession }) =>
        Promise.all([getOptionalSession(), getOptionalSession()])
      )

    for (const cookie of ['first', 'second']) {
      const response = await app.handle(
        new Request('http://localhost/', { headers: { cookie } })
      )
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual([session, session])
    }
    expect(getSession).toHaveBeenCalledTimes(2)
    expect(getSession).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ headers: new Headers({ cookie: 'second' }) })
    )
  }
)

test.each([
  null,
  {
    ...sessionForRole('user'),
    user: { ...sessionForRole('user').user, isAnonymous: true }
  }
])(
  'authentication rejects revoked and anonymous sessions: %j',
  async (currentSession) => {
    const { betterAuth, getSession } = createTestAuth(
      sessionForRole('admin'),
      currentSession
    )
    const app = new Elysia()
      .use(createBetterAuthPlugin(betterAuth))
      .get('/', ({ user }) => user.id, { auth: true })

    expect((await app.handle(new Request('http://localhost/'))).status).toBe(
      401
    )
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    )
  }
)
