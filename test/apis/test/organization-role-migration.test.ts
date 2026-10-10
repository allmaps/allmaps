import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { drizzle } from 'drizzle-orm/pglite'
import { expect, it } from 'vitest'
import {
  loadMigrations,
  migrateDatabase,
  migrationsDirectory
} from '@allmaps/db/migrations'
import { initializePglite } from '../../../tools/apis/src/migrations.ts'
import { testDirectory } from './helpers/isolation.ts'

const roleMigrationName = loadMigrations().find((migration) =>
  migration.name?.endsWith('_normalize-organization-roles')
)?.name
if (!roleMigrationName) throw new Error('Organization role migration not found')
const indexesMigrationName = '20261020163511_partial-map-indexes'

it('continues the partial map indexes snapshot with a data-only role migration', async () => {
  const names = loadMigrations().map((migration) => migration.name)
  expect(names.indexOf(roleMigrationName)).toBeGreaterThan(
    names.indexOf(indexesMigrationName)
  )
  const snapshot = JSON.parse(
    await readFile(
      join(migrationsDirectory, roleMigrationName, 'snapshot.json'),
      'utf8'
    )
  )
  const previous = JSON.parse(
    await readFile(
      join(migrationsDirectory, indexesMigrationName, 'snapshot.json'),
      'utf8'
    )
  )
  expect(snapshot.prevIds).toEqual([previous.id])
  expect(snapshot.id).not.toBe(previous.id)
  expect({ ...snapshot, id: previous.id, prevIds: previous.prevIds }).toEqual(
    previous
  )
})

it('upgrades organization roles after the map indexes migration without changing existing history or indexes', async () => {
  const directory = await mkdtemp(join(testDirectory(), 'organization-roles-'))
  const client = await PGlite.create({ extensions: { postgis } })
  try {
    for (const migration of loadMigrations()) {
      if (migration.name === roleMigrationName) continue
      await cp(
        join(migrationsDirectory, migration.name!),
        join(directory, migration.name!),
        { recursive: true }
      )
    }
    await initializePglite(client, directory)
    await client.exec(`
      INSERT INTO users (id, full_name, email, role)
      VALUES ('role-user', 'Role User', 'roles@example.test', 'collaborator');
      INSERT INTO organizations (id, name, slug, created_at)
      VALUES ('role-organization', 'Role Organization', 'role-organization', now());
      INSERT INTO members (id, organization_id, user_id, role, created_at)
      SELECT id, 'role-organization', 'role-user', role, now()
      FROM (VALUES
        ('a', 'owner'), ('b', 'member, owner'), ('c', 'admin,member'),
        ('d', 'admin'), ('e', 'member'), ('f', 'editor')
      ) AS roles(id, role);
      INSERT INTO invitations (id, organization_id, email, role, status, expires_at, inviter_id)
      SELECT id, 'role-organization', 'invite@example.test', role, status, now(), 'role-user'
      FROM (VALUES
        ('a', 'owner', 'pending'), ('b', 'member, admin', 'pending'),
        ('c', NULL, 'pending'), ('d', 'member', 'pending'),
        ('e', 'editor', 'pending'), ('f', 'owner', 'accepted')
      ) AS roles(id, role, status);
    `)
    const historySql = 'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id'
    const indexesSql =
      "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'maps' ORDER BY indexname"
    const history = (await client.query(historySql)).rows
    const indexes = (await client.query(indexesSql)).rows

    await cp(
      join(migrationsDirectory, roleMigrationName),
      join(directory, roleMigrationName),
      { recursive: true }
    )
    expect(await migrateDatabase(drizzle({ client }), directory)).toEqual([
      roleMigrationName
    ])
    expect((await client.query(historySql)).rows.slice(0, -1)).toEqual(history)
    expect((await client.query(indexesSql)).rows).toEqual(indexes)
    expect(
      (await client.query('SELECT role FROM members ORDER BY id')).rows
    ).toEqual(
      ['owner', 'owner', 'owner', 'owner', 'member', 'member'].map((role) => ({
        role
      }))
    )
    expect(
      (await client.query('SELECT role FROM invitations ORDER BY id')).rows
    ).toEqual(
      ['owner', 'owner', 'member', 'member', 'member', 'owner'].map((role) => ({
        role
      }))
    )
    expect(
      (await client.query("SELECT role FROM users WHERE id = 'role-user'")).rows
    ).toEqual([{ role: 'collaborator' }])
    expect(await migrateDatabase(drizzle({ client }), directory)).toEqual([])
  } finally {
    await client.close()
    await rm(directory, { recursive: true, force: true })
  }
})
