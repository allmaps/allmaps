import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { beforeAll, afterAll, expect, test } from 'vitest'
import { relations } from '@allmaps/db'
import { setUserRole } from '@allmaps/api-shared/db'

const client = new PGlite()
const db = drizzle({ client, relations })
beforeAll(async () => {
  await client.exec(`CREATE TABLE users (
    id text PRIMARY KEY, role text, is_anonymous boolean DEFAULT false,
    updated_at timestamp DEFAULT now()
  );
  INSERT INTO users (id, role, is_anonymous) VALUES
    ('regular', 'user', false), ('admin', 'admin', false),
    ('anonymous', 'user', true), ('promoted', 'user', false);`)
})
afterAll(() => client.close())
test('assigns and removes Collaborator in the database', async () => {
  expect(await setUserRole(db, 'regular', 'collaborator')).toEqual({
    id: 'regular',
    role: 'collaborator'
  })
  expect(await setUserRole(db, 'regular', 'user')).toEqual({
    id: 'regular',
    role: 'user'
  })
})
test.each(['user', 'collaborator'] as const)(
  'cannot change an Admin to %s',
  async (role) => {
    await expect(setUserRole(db, 'admin', role)).rejects.toMatchObject({
      status: 403
    })
    expect(
      (await client.query('SELECT role FROM users WHERE id = $1', ['admin']))
        .rows
    ).toEqual([{ role: 'admin' }])
  }
)
test('the write predicate protects an account promoted since the profile was loaded', async () => {
  await client.query('UPDATE users SET role = $1 WHERE id = $2', [
    'admin',
    'promoted'
  ])
  await expect(
    setUserRole(db, 'promoted', 'collaborator')
  ).rejects.toMatchObject({ status: 403 })
})
test('cannot assign roles to anonymous accounts', async () => {
  await expect(
    setUserRole(db, 'anonymous', 'collaborator')
  ).rejects.toMatchObject({ status: 403 })
})
test('missing users return 404', async () => {
  await expect(
    setUserRole(db, 'missing', 'collaborator')
  ).rejects.toMatchObject({ status: 404 })
})
