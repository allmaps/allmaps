import { Elysia } from 'elysia'
import { describe, expect, test, vi } from 'vitest'
import type { Db } from '@allmaps/db'
import * as authSchema from '@allmaps/db/schema/auth'
import { changeOrganizationMember } from '@allmaps/api-shared/db'
import { createAuthRoutes } from '../src/routes/auth.js'
import { createTestAuth, env, request, sessionForRole } from './helpers.js'

vi.mock('@allmaps/api-shared/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@allmaps/api-shared/db')>()),
  queryAdminOrganizationById: vi.fn(async () => ({ id: 'organization-id' })),
  queryUserByEmail: vi.fn(async () => ({ id: 'target-user' })),
  queryOrganizationMembersById: vi.fn(async () => [])
}))

function setup(
  userRole: string,
  memberRole?: string,
  currentMemberRole = memberRole,
  secondOwner = false
) {
  const members = [
    ...(currentMemberRole
      ? [{ id: 'actor-member', userId: 'user-id', role: currentMemberRole }]
      : []),
    {
      id: 'target-member',
      userId: 'target-user',
      role: secondOwner ? 'owner' : 'member'
    }
  ]
  const lock = vi.fn(async () => [{ id: 'organization-id' }])
  const write = vi.fn()
  const db = {
    query: {
      members: {
        findFirst: vi.fn(async ({ where }) =>
          where.organizationId.eq === 'organization-id' && memberRole
            ? { role: memberRole }
            : undefined
        )
      }
    },
    transaction: async <T>(callback: (tx: unknown) => Promise<T>) =>
      callback(db),
    select: () => ({
      from: (table: unknown) => ({
        where: () =>
          table === authSchema.organizations
            ? { for: lock }
            : Promise.resolve(members)
      })
    }),
    update: () => ({
      set: (data: unknown) => {
        write(data)
        return { where: () => ({ returning: async () => [data] }) }
      }
    }),
    delete: () => ({
      where: async () => {
        write('delete')
      }
    })
  }
  const { betterAuth } = createTestAuth(sessionForRole(userRole))
  const addMember = vi.fn(async ({ body }) => body)
  Object.assign(betterAuth.auth.api, { addMember })
  const app = new Elysia()
    .decorate('db', db as unknown as Db)
    .decorate('env', env)
    .use(createAuthRoutes(env, betterAuth))
  return { app, db: db as unknown as Db, write, lock, addMember }
}

describe('organization membership management', () => {
  test.each([
    ['admin', undefined, 200],
    ['user', 'owner', 200],
    ['user', 'member', 403],
    ['user', 'admin', 403],
    ['user', undefined, 403],
    ['collaborator', undefined, 200]
  ] as const)(
    '%s with organization role %s may manage members: %i',
    async (role, membership, status) => {
      const { app, write, addMember } = setup(role, membership)
      const update = await app.handle(
        request(
          '/organizations/organization-id/users/target-user',
          { role: 'member' },
          'PATCH'
        )
      )
      const remove = await app.handle(
        request(
          '/organizations/organization-id/users/target-user',
          undefined,
          'DELETE'
        )
      )
      const add = await app.handle(
        request('/organizations/organization-id/users', {
          email: 'target@example.org',
          role: 'member'
        })
      )
      expect(update.status).toBe(status)
      expect(remove.status).toBe(status)
      expect(add.status).toBe(status)
      expect(write).toHaveBeenCalledTimes(status === 200 ? 2 : 0)
      expect(addMember).toHaveBeenCalledTimes(status === 200 ? 1 : 0)
    }
  )

  test('organization owners cannot add members to another organization', async () => {
    const { app, addMember } = setup('user', 'owner')
    const response = await app.handle(
      request('/organizations/another-organization/users', {
        email: 'target@example.org'
      })
    )
    expect(response.status).toBe(403)
    expect(addMember).not.toHaveBeenCalled()
  })

  test.each(['member', null] as const)(
    'the final organization owner cannot be changed to %s',
    async (role) => {
      const { db, write, lock } = setup('collaborator', 'owner')
      await expect(
        changeOrganizationMember(
          db,
          'organization-id',
          'user-id',
          role,
          sessionForRole('collaborator').user
        )
      ).rejects.toMatchObject({ status: 409 })
      expect(lock).toHaveBeenCalledWith('update')
      expect(write).not.toHaveBeenCalled()
    }
  )

  test.each(['member', null] as const)(
    'Allmaps admins cannot change the final owner to %s',
    async (role) => {
      const { db, write } = setup('admin', 'owner')
      await expect(
        changeOrganizationMember(
          db,
          'organization-id',
          'user-id',
          role,
          sessionForRole('admin').user
        )
      ).rejects.toMatchObject({ status: 409 })
      expect(write).not.toHaveBeenCalled()
    }
  )

  test('organization owners cannot change ownership even if another owner remains', async () => {
    const { db, write } = setup('user', 'owner', 'owner', true)
    await expect(
      changeOrganizationMember(
        db,
        'organization-id',
        'user-id',
        'member',
        sessionForRole('user').user
      )
    ).rejects.toMatchObject({ status: 403 })
    expect(write).not.toHaveBeenCalled()
  })

  test('permissions are rechecked after locking the organization', async () => {
    const { app, write } = setup('user', 'owner', 'member')
    const response = await app.handle(
      request(
        '/organizations/organization-id/users/target-user',
        { role: 'owner' },
        'PATCH'
      )
    )
    expect(response.status).toBe(403)
    expect(write).not.toHaveBeenCalled()
  })
})

test.each(['owner', 'member'])(
  'owners cannot assign owner through add or update (target %s)',
  async (targetRole) => {
    const { app, write, addMember } = setup(
      'user',
      'owner',
      'owner',
      targetRole === 'owner'
    )
    expect(
      (
        await app.handle(
          request('/organizations/organization-id/users', {
            email: 'new@example.org',
            role: 'owner'
          })
        )
      ).status
    ).toBe(403)
    expect(
      (
        await app.handle(
          request(
            '/organizations/organization-id/users/target-user',
            { role: 'owner' },
            'PATCH'
          )
        )
      ).status
    ).toBe(403)
    expect(addMember).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  }
)
test.each(['admin', 'collaborator'])(
  '%s can assign and change owners while keeping one owner',
  async (role) => {
    const { app, write } = setup(role, 'owner', 'owner', true)
    expect(
      (
        await app.handle(
          request(
            '/organizations/organization-id/users/target-user',
            { role: 'member' },
            'PATCH'
          )
        )
      ).status
    ).toBe(200)
    expect(write).toHaveBeenCalledWith({ role: 'member' })
  }
)
test('owners cannot remove other owners', async () => {
  const { app, write } = setup('user', 'owner', 'owner', true)
  expect(
    (
      await app.handle(
        request(
          '/organizations/organization-id/users/target-user',
          undefined,
          'DELETE'
        )
      )
    ).status
  ).toBe(403)
  expect(write).not.toHaveBeenCalled()
})
test.each([
  ['user', 'member', 200],
  ['user', 'owner', 200],
  ['user', undefined, 403],
  ['collaborator', undefined, 200],
  ['admin', undefined, 200]
] as const)(
  '%s %s can view membership list: %i',
  async (role, memberRole, status) => {
    const { app } = setup(role, memberRole)
    expect(
      (
        await app.handle(
          request('/organizations/organization-id/users', undefined, 'GET')
        )
      ).status
    ).toBe(status)
  }
)
