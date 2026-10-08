import { Elysia } from 'elysia'
import { describe, expect, test } from 'vitest'

import { createAuth } from '@allmaps/db/auth'
import { createBetterAuthPlugin } from '@allmaps/api-shared/elysia'
import { clampLimit, COLLABORATOR_MAX_LIMIT } from '@allmaps/api-shared'
import {
  getUserLimitRole,
  canImportIiif
} from '../../../packages/api-shared/src/shared/permissions.js'

import {
  createMembershipDb,
  createTestAuth,
  sessionForRole
} from './helpers.js'

describe('query limits', () => {
  test.each([
    [null, 'public', 200],
    ['user', 'user', 400],
    ['collaborator', 'collaborator', 1000],
    ['admin', 'admin', 600],
    ['unrecognized', 'user', 400]
  ] as const)(
    '%s resolves to %s with a maximum of %i',
    (role, expected, maximum) => {
      const user = role === null ? undefined : sessionForRole(role).user
      expect(getUserLimitRole(user)).toBe(expected)
      expect(clampLimit(2000, getUserLimitRole(user))).toBe(maximum)
    }
  )

  test.each([1, 200, 400, 999, 1000, 1001])(
    'clamps requested collaborator limit %i',
    (limit) => {
      expect(clampLimit(limit, 'collaborator')).toBe(Math.min(limit, 1000))
    }
  )

  test('keeps the default and organization-plan maximum', () => {
    expect(COLLABORATOR_MAX_LIMIT).toBe(1000)
    expect(clampLimit(undefined, 'collaborator')).toBe(50)
    expect(clampLimit(1000, 'organizationPlanMember')).toBe(600)
  })
})

function createPermissionApp(
  role: string | null,
  plan: string | null,
  currentRole = role
) {
  const { betterAuth, getSession } = createTestAuth(
    role === null ? null : sessionForRole(role),
    currentRole === null ? null : sessionForRole(currentRole)
  )
  const db = createMembershipDb(plan)
  const app = new Elysia()
    .decorate('db', db)
    .use(createBetterAuthPlugin(betterAuth))
    .get('/limit', async ({ getLimitRole }) => getLimitRole())
    .get('/organization-limit', async ({ getOrganizationLimitRole }) =>
      getOrganizationLimitRole({ id: 'organization-id' })
    )
    .get('/organization-import', async ({ canImportOrganizationIiif }) =>
      canImportOrganizationIiif({ id: 'organization-id' })
    )
    .post('/import', () => 'Imported', { importIiif: true })
    .post('/admin', () => 'Admin', { admin: true })

  return { app, db, getSession }
}

test.each([
  [null, 401],
  ['user', 403],
  ['collaborator', 200],
  ['admin', 200],
  ['unrecognized', 403]
] as const)('general import access for %s returns %i', async (role, status) => {
  const { app, getSession } = createPermissionApp(role, null)
  const response = await app.handle(
    new Request('http://localhost/import', { method: 'POST' })
  )
  expect(response.status).toBe(status)
  expect(canImportIiif(role === null ? null : sessionForRole(role).user)).toBe(
    status === 200
  )
  expect(getSession).toHaveBeenCalledWith(
    expect.objectContaining({
      query: { disableCookieCache: true }
    })
  )
})

test('collaborators are refused administrator access', async () => {
  const { app } = createPermissionApp('collaborator', null)
  const response = await app.handle(
    new Request('http://localhost/admin', { method: 'POST' })
  )
  expect(response.status).toBe(401)
})

test.each([
  [null, null, 'public', false],
  ['user', null, 'user', false],
  ['user', 'contributor', 'organizationPlanMember', true],
  ['collaborator', null, 'collaborator', false],
  ['collaborator', 'supporter', 'collaborator', true],
  ['collaborator', 'innovator', 'collaborator', true],
  ['collaborator', 'unrecognized', 'collaborator', false],
  ['admin', null, 'admin', true]
] as const)(
  'organization policy for %s with plan %s',
  async (role, plan, limitRole, canImport) => {
    const { app, db } = createPermissionApp(role, plan)
    expect(
      await (
        await app.handle(new Request('http://localhost/organization-limit'))
      ).text()
    ).toBe(limitRole)
    expect(
      await (
        await app.handle(new Request('http://localhost/organization-import'))
      ).json()
    ).toBe(canImport)

    expect(db.query.limit).toHaveBeenCalledTimes(
      role === 'user' ? 2 : role === 'collaborator' ? 1 : 0
    )
  }
)

test('role revocation immediately removes imports despite a cached collaborator session', async () => {
  const { app } = createPermissionApp('collaborator', null, 'user')
  expect(
    (
      await app.handle(
        new Request('http://localhost/import', { method: 'POST' })
      )
    ).status
  ).toBe(403)
  expect(
    await (await app.handle(new Request('http://localhost/limit'))).text()
  ).toBe('collaborator')
})

test('revoked sessions cannot import into an organization', async () => {
  const { app, db } = createPermissionApp('collaborator', 'supporter', null)
  expect(
    await (
      await app.handle(new Request('http://localhost/organization-import'))
    ).json()
  ).toBe(false)
  expect(db.select).not.toHaveBeenCalled()
})

test('production Better Auth registers Collaborator with no administration permissions', () => {
  const { auth } = createAuth({
    DATABASE_URL: 'postgresql://test:test@database.example/allmaps',
    BETTER_AUTH_URL: 'https://api.example',
    BETTER_AUTH_SECRET: 'test-secret-with-at-least-thirty-two-characters',
    BETTER_AUTH_COOKIE_PREFIX: 'test',
    GITHUB_CLIENT_ID: 'test',
    GITHUB_CLIENT_SECRET: 'test'
  })
  const plugin = auth.options.plugins?.find((plugin) => plugin.id === 'admin')
  expect(plugin?.options.adminRoles).toEqual(['admin'])
  const roles = plugin?.options.roles
  expect(roles?.collaborator).toBeDefined()
  expect(roles?.collaborator).toBe(roles?.user)
  const collaborator = roles?.collaborator
  const admin = roles?.admin
  if (!collaborator || !admin) {
    throw new Error('Missing production roles')
  }
  for (const action of [
    'create',
    'list',
    'set-role',
    'ban',
    'impersonate',
    'delete',
    'get',
    'update'
  ] as const) {
    expect(collaborator.authorize({ user: [action] }).success).toBe(false)
  }
  for (const action of ['list', 'revoke', 'delete'] as const) {
    expect(collaborator.authorize({ session: [action] }).success).toBe(false)
  }
  expect(admin.authorize({ user: ['set-role'] }).success).toBe(true)
})
