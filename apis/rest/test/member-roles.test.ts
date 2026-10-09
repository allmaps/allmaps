import { Elysia } from 'elysia'
import { describe, expect, test, vi } from 'vitest'

import type { Db } from '@allmaps/db'
import type { BetterAuthContext } from '@allmaps/db/auth'

import { createAuthRoutes } from '../src/routes/auth.js'
import { createTestAuth, env, request, sessionForRole } from './helpers.js'

vi.mock('@allmaps/api-shared/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@allmaps/api-shared/db')>()),
  queryAdminOrganizationById: vi.fn(async () => ({ id: 'organization-id' })),
  queryOrganizationMemberByUserId: vi.fn(async () => ({ id: 'member-id' })),
  queryUserByEmail: vi.fn(async () => ({ id: 'user-id' }))
}))

function setup() {
  const { betterAuth: testAuth } = createTestAuth(sessionForRole('admin'))
  type MemberBody = {
    role: string | string[]
    organizationId: string
    userId?: string
    memberId?: string
  }
  const addMember = vi.fn(async ({ body }: { body: MemberBody }) => body)
  const updateMemberRole = vi.fn(async ({ body }: { body: MemberBody }) => body)
  const betterAuth = {
    ...testAuth,
    auth: {
      ...testAuth.auth,
      api: { ...testAuth.auth.api, addMember, updateMemberRole }
    }
  } as unknown as BetterAuthContext
  const app = new Elysia()
    .decorate('db', {} as Db)
    .decorate('env', env)
    .use(createAuthRoutes(env, betterAuth))

  return { app, addMember, updateMemberRole }
}

describe('adding organization members', () => {
  test('an omitted role defaults explicitly to member', async () => {
    const { app, addMember } = setup()
    const response = await app.handle(
      request('/organizations/organization-id/users', {
        email: 'user@example.org'
      })
    )

    expect(response.status).toBe(200)
    expect(addMember).toHaveBeenCalledWith({
      body: {
        userId: 'user-id',
        organizationId: 'organization-id',
        role: 'member'
      }
    })
    expect(await response.json()).toMatchObject({ role: 'member' })
  })

  test.each(
    ['admin', 'member', 'owner', ['admin', 'member']].map((role) => ({ role }))
  )('preserves the explicitly supplied role %j', async ({ role }) => {
    const { app, addMember } = setup()
    const response = await app.handle(
      request('/organizations/organization-id/users', {
        email: 'user@example.org',
        role
      })
    )

    expect(response.status).toBe(200)
    expect(addMember).toHaveBeenCalledWith({
      body: {
        userId: 'user-id',
        organizationId: 'organization-id',
        role
      }
    })
  })

  test.each([null, 'invalid', ['member', 'invalid']].map((role) => ({ role })))(
    'rejects invalid role %j before calling Better Auth',
    async ({ role }) => {
      const { app, addMember } = setup()
      const response = await app.handle(
        request('/organizations/organization-id/users', {
          email: 'user@example.org',
          role
        })
      )

      expect(response.status).toBe(422)
      expect(addMember).not.toHaveBeenCalled()
    }
  )
})

describe('updating organization member roles', () => {
  test.each([{}, { role: null }, { role: 'invalid' }])(
    'rejects missing or invalid roles: %j',
    async (body) => {
      const { app, updateMemberRole } = setup()
      const response = await app.handle(
        request('/organizations/organization-id/users/user-id', body, 'PATCH')
      )

      expect(response.status).toBe(422)
      expect(updateMemberRole).not.toHaveBeenCalled()
    }
  )

  test.each(['admin', 'member', 'owner'])(
    'preserves the explicitly supplied role %s',
    async (role) => {
      const { app, updateMemberRole } = setup()
      const response = await app.handle(
        request(
          '/organizations/organization-id/users/user-id',
          { role },
          'PATCH'
        )
      )

      expect(response.status).toBe(200)
      expect(updateMemberRole).toHaveBeenCalledWith({
        body: {
          memberId: 'member-id',
          organizationId: 'organization-id',
          role
        },
        headers: expect.any(Headers)
      })
    }
  )
})
