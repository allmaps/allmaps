import { Elysia } from 'elysia'
import { beforeEach, expect, test, vi } from 'vitest'
import type { Db } from '@allmaps/db'
import { setUserRole } from '@allmaps/api-shared/db'
import { createAuthRoutes } from '../src/routes/auth.js'
import { createTestAuth, env, request, sessionForRole } from './helpers.js'

vi.mock('@allmaps/api-shared/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@allmaps/api-shared/db')>()),
  setUserRole: vi.fn(async (_db, id, role) => ({ id, role }))
}))
beforeEach(() => vi.clearAllMocks())
function setup(role: string | null, currentRole = role, anonymous = false) {
  const cached = role === null ? null : sessionForRole(role)
  const current = currentRole === null ? null : sessionForRole(currentRole)
  if (current) current.user.isAnonymous = anonymous
  const { betterAuth, getSession } = createTestAuth(cached, current)
  const app = new Elysia()
    .decorate('db', {} as Db)
    .decorate('env', env)
    .use(createAuthRoutes(env, betterAuth))
  return { app, getSession }
}
test.each(['user', 'collaborator'] as const)(
  'admins may assign %s',
  async (role) => {
    const { app, getSession } = setup('admin')
    const response = await app.handle(
      request('/users/target-user/role', { role }, 'PATCH')
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'target-user', role })
    expect(getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    )
  }
)
test.each(['admin', 'owner', ['user', 'admin'], null])(
  'the role endpoint rejects %j even for admins',
  async (role) => {
    const { app } = setup('admin')
    expect(
      (await app.handle(request('/users/target-user/role', { role }, 'PATCH')))
        .status
    ).toBe(422)
    expect(setUserRole).not.toHaveBeenCalled()
  }
)
test.each([null, 'user', 'collaborator'])(
  '%s cannot assign Collaborator',
  async (role) => {
    const { app } = setup(role)
    expect(
      (
        await app.handle(
          request('/users/target-user/role', { role: 'collaborator' }, 'PATCH')
        )
      ).status
    ).toBe(401)
    expect(setUserRole).not.toHaveBeenCalled()
  }
)
test('cached admin status cannot grant roles after revocation', async () => {
  const { app } = setup('admin', 'user')
  expect(
    (
      await app.handle(
        request('/users/target-user/role', { role: 'collaborator' }, 'PATCH')
      )
    ).status
  ).toBe(401)
  expect(setUserRole).not.toHaveBeenCalled()
})
test('anonymous sessions cannot read even their own Console profile', async () => {
  const { app } = setup('user', 'user', true)
  expect(
    (await app.handle(request('/users/user-id', undefined, 'GET'))).status
  ).toBe(401)
  expect((await app.handle(request('/users', undefined, 'GET'))).status).toBe(
    401
  )
})
