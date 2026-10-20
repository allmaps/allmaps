import { temporaryDirectory } from './helpers/context.ts'
import { mkdir, writeFile, rm, stat, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/pglite'
import {
  ciDatabaseUrl,
  loadMigrations,
  migrateDatabase
} from '@allmaps/db/migrations'
import {
  checkMigrations,
  initializePglite,
  migratePglite,
  migratePgliteDirectory,
  pgliteMigrations,
  postgresMigrations
} from '@allmaps/tools-apis'

let directory: string
let client: PGlite
beforeEach(async () => {
  directory = await temporaryDirectory('migrations-')
  client = await PGlite.create({ extensions: { postgis } })
})
afterEach(async () => {
  await client.close()
  await rm(directory, { recursive: true, force: true })
})
async function migration(name: string, sql: string) {
  const path = join(directory, name)
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'snapshot.json'), '{}')
  await writeFile(join(path, 'migration.sql'), sql)
}
const first = '20260101000000_first'
const second = '20260102000000_second'
const initialize = () => initializePglite(client, directory)
const check = () => checkMigrations(pgliteMigrations(client), directory)

it('initializes multi-statement scripts transactionally and can retry a failed empty database', async () => {
  await migration(
    first,
    'CREATE TABLE example (value int); INSERT INTO example VALUES (1);'
  )
  await migration(
    second,
    'INSERT INTO example VALUES (2); SELECT invalid_column;'
  )
  await expect(initialize()).rejects.toThrow()
  expect(
    (await client.query("SELECT to_regclass('example') AS name")).rows
  ).toEqual([{ name: null }])
  await migration(second, 'INSERT INTO example VALUES (2);')
  await initialize()
  await initialize()
  expect(
    (await client.query('SELECT value FROM example ORDER BY value')).rows
  ).toEqual([{ value: 1 }, { value: 2 }])
})

it('rejects changed, missing and inserted historical migrations without resetting data', async () => {
  await migration(second, 'CREATE TABLE example (value int);')
  await initialize()
  await migration(second, 'CREATE TABLE example (value text);')
  await expect(initialize()).rejects.toThrow('changed')
  await expect(migratePglite(client, directory)).rejects.toThrow('changed')
  await rm(join(directory, second), { recursive: true })
  await expect(initialize()).rejects.toThrow('missing')
  await expect(migratePglite(client, directory)).rejects.toThrow('missing')
  await migration(second, 'CREATE TABLE example (value int);')
  await migration(first, 'SELECT 1;')
  await expect(initialize()).rejects.toThrow('diverged')
  await expect(migratePglite(client, directory)).rejects.toThrow('diverged')
})

it('checks legacy metadata by hash without upgrading or changing its columns', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  await initialize()
  await client.exec(
    'ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN name; ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN applied_at;'
  )
  const exec = vi.spyOn(client, 'exec')
  const transaction = vi.spyOn(client, 'transaction')
  await check()
  await initialize()
  expect(exec).not.toHaveBeenCalled()
  expect(transaction).not.toHaveBeenCalled()
  expect(
    (
      await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'drizzle' AND column_name = 'name'"
      )
    ).rows
  ).toEqual([])
})

it('never applies pending SQL to an existing local database during startup', async () => {
  await migration(
    first,
    'CREATE TABLE example (value int); INSERT INTO example VALUES (42);'
  )
  await initialize()
  await migration(second, 'DROP TABLE example;')
  const exec = vi.spyOn(client, 'exec')
  const transaction = vi.spyOn(client, 'transaction')
  await expect(initialize()).rejects.toThrow('missing local migrations')
  expect(exec).not.toHaveBeenCalled()
  expect(transaction).not.toHaveBeenCalled()
  expect((await client.query('SELECT value FROM example')).rows).toEqual([
    { value: 42 }
  ])
})

it('does not initialize a populated database without migration metadata', async () => {
  await migration(first, 'DROP TABLE valuable;')
  await client.exec(
    'CREATE TABLE valuable (value int); INSERT INTO valuable VALUES (42);'
  )
  await expect(initialize()).rejects.toThrow('missing local migrations')
  await expect(migratePglite(client, directory)).rejects.toThrow(
    'no migration history'
  )
  expect((await client.query('SELECT value FROM valuable')).rows).toEqual([
    { value: 42 }
  ])
})

it('manually applies only pending migrations and retains existing data and history', async () => {
  await migration(
    first,
    'CREATE TABLE example (value int); INSERT INTO example VALUES (42);'
  )
  await initialize()
  const original = (
    await client.query('SELECT * FROM drizzle.__drizzle_migrations')
  ).rows[0]
  await migration(
    second,
    "ALTER TABLE example ADD COLUMN note text; UPDATE example SET note = 'kept';"
  )
  expect(await migratePglite(client, directory)).toEqual([second])
  expect((await client.query('SELECT value, note FROM example')).rows).toEqual([
    { value: 42, note: 'kept' }
  ])
  const history = (
    await client.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')
  ).rows
  expect(history).toHaveLength(2)
  expect(history[0]).toEqual(original)
  expect(await migratePglite(client, directory)).toEqual([])
  expect(
    (
      await client.query(
        'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id'
      )
    ).rows
  ).toEqual(history)
  await check()
})

it('rolls back all pending migrations together and can retry corrected SQL', async () => {
  const third = '20260103000000_third'
  await migration(
    first,
    'CREATE TABLE example (value int); INSERT INTO example VALUES (42);'
  )
  await initialize()
  await migration(
    second,
    'ALTER TABLE example ADD COLUMN note text; UPDATE example SET value = 43;'
  )
  await migration(third, 'SELECT invalid_column;')
  await expect(migratePglite(client, directory)).rejects.toThrow(
    'invalid_column'
  )
  expect((await client.query('SELECT * FROM example')).rows).toEqual([
    { value: 42 }
  ])
  expect(
    (await client.query('SELECT name FROM drizzle.__drizzle_migrations')).rows
  ).toEqual([{ name: first }])
  await migration(third, "UPDATE example SET note = 'migrated';")
  expect(await migratePglite(client, directory)).toEqual([second, third])
  expect((await client.query('SELECT * FROM example')).rows).toEqual([
    { value: 43, note: 'migrated' }
  ])
})

it('supports manual migration of older PGlite metadata without rewriting its history', async () => {
  await migration(
    first,
    'CREATE TABLE example (value int); INSERT INTO example VALUES (42);'
  )
  await initialize()
  await client.exec(
    'ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN name; ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN applied_at;'
  )
  const original = (
    await client.query<Record<string, unknown>>(
      'SELECT * FROM drizzle.__drizzle_migrations'
    )
  ).rows[0]
  await migration(second, 'ALTER TABLE example ADD COLUMN note text;')
  expect(await migratePglite(client, directory)).toEqual([second])
  const history = (
    await client.query<Record<string, unknown>>(
      'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id'
    )
  ).rows
  expect(history[0]).toEqual({ ...original, name: null })
  expect(history[1].name).toBe(second)
  expect((await client.query('SELECT value FROM example')).rows).toEqual([
    { value: 42 }
  ])
  await check()
})

it('migrates an existing temporary directory, closes it, and never creates a missing database', async () => {
  const dataDir = join(directory, 'database')
  await expect(migratePgliteDirectory(dataDir, directory)).rejects.toThrow(
    'No existing PGlite'
  )
  await expect(stat(dataDir)).rejects.toMatchObject({ code: 'ENOENT' })
  await migration(
    first,
    'CREATE TABLE example (value int); INSERT INTO example VALUES (42);'
  )
  const original = await PGlite.create({ dataDir, extensions: { postgis } })
  try {
    await initializePglite(original, directory)
  } finally {
    await original.close()
  }
  await migration(second, 'ALTER TABLE example ADD COLUMN note text;')
  expect(await migratePgliteDirectory(dataDir, directory)).toEqual([second])
  const reopened = await PGlite.create({ dataDir, extensions: { postgis } })
  try {
    expect((await reopened.query('SELECT * FROM example')).rows).toEqual([
      { value: 42, note: null }
    ])
    await checkMigrations(pgliteMigrations(reopened), directory)
  } finally {
    await reopened.close()
  }
})

it('only sends read queries through the PostgreSQL adapter, for empty and migrated databases', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  const unsafe = vi.fn(async (sql: string, values?: unknown[]) => {
    expect(sql).toMatch(/^SELECT /)
    return (await client.query(sql, values)).rows
  })
  // Exercise the actual PostgreSQL reader using temporary PGlite as its only backend.
  const connection = postgresMigrations({ unsafe } as unknown as Parameters<
    typeof postgresMigrations
  >[0])
  await expect(checkMigrations(connection, directory)).rejects.toThrow(
    'missing local migrations'
  )
  await initialize()
  await checkMigrations(connection, directory)
  await migration(second, 'DROP TABLE example;')
  await expect(checkMigrations(connection, directory)).rejects.toThrow(
    'missing local migrations'
  )
  expect(
    (await client.query("SELECT to_regclass('example') AS name")).rows
  ).toEqual([{ name: 'example' }])
})

const migrateCi = () => migrateDatabase(drizzle({ client }), directory)

it('CI validates legacy history before Drizzle upgrades it, migrates and safely repeats', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  await initialize()
  await client.exec(`
    INSERT INTO example VALUES (42);
    ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN name;
    ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN applied_at;
  `)
  await migration(second, 'ALTER TABLE example ADD COLUMN note text;')
  expect(await migrateCi()).toEqual([second])
  expect((await client.query('SELECT * FROM example')).rows).toEqual([
    { value: 42, note: null }
  ])
  expect(await migrateCi()).toEqual([])
  await check()
})

it('CI refuses invalid history before invoking Drizzle or upgrading metadata', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  await initialize()
  await client.exec('ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN name')
  await migration(first, 'DROP TABLE example;')
  await expect(migrateCi()).rejects.toThrow('changed')
  expect(
    (
      await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'drizzle' AND column_name = 'name'
  `)
    ).rows
  ).toEqual([])
})

it('CI rolls back failed migrations and can retry after correcting pending SQL', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  await initialize()
  await client.exec('INSERT INTO example VALUES (42)')
  await migration(second, 'UPDATE example SET value = 99;')
  await migration('20260103000000_third', 'SELECT nonexistent_column;')
  await expect(migrateCi()).rejects.toThrow()
  expect((await client.query('SELECT * FROM example')).rows).toEqual([
    { value: 42 }
  ])
  await rm(join(directory, '20260103000000_third'), { recursive: true })
  expect(await migrateCi()).toEqual([second])
})

it('CI requires existing migration metadata and PostGIS before invoking Drizzle', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  await expect(migrateCi()).rejects.toThrow('no Drizzle migration history')
  await initialize()
  await client.exec('DROP EXTENSION postgis')
  await migration(second, 'ALTER TABLE example ADD COLUMN note text;')
  await expect(migrateCi()).rejects.toThrow('PostGIS must be installed')
})

it('rejects duplicate and reordered applied history before invoking Drizzle', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  await migration(second, 'ALTER TABLE example ADD COLUMN note text;')
  await initialize()
  await client.exec(`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name)
    SELECT hash, created_at, name FROM drizzle.__drizzle_migrations WHERE id = 1;
  `)
  await expect(migrateCi()).rejects.toThrow('duplicated')
  await client.exec(`
    DELETE FROM drizzle.__drizzle_migrations WHERE id = 3;
    UPDATE drizzle.__drizzle_migrations SET id = 3 WHERE id = 1;
  `)
  await expect(migrateCi()).rejects.toThrow('out of order')
})

it('rejects incomplete folders and duplicate migration timestamps', async () => {
  await migration(first, 'SELECT 1;')
  await rm(join(directory, first, 'snapshot.json'))
  expect(() => loadMigrations(directory)).toThrow()
  await migration(first, 'SELECT 1;')
  await rm(join(directory, first, 'migration.sql'))
  expect(() => loadMigrations(directory)).toThrow()
  await mkdir(join(directory, first, 'migration.sql'))
  expect(() => loadMigrations(directory)).toThrow('Missing migration SQL file')
  await rm(join(directory, first, 'migration.sql'), { recursive: true })
  await migration(first, 'SELECT 1;')
  await migration('20260101000000_same_timestamp', 'SELECT 2;')
  expect(() => loadMigrations(directory)).toThrow(
    'duplicate migration timestamp'
  )
})

it('CI requires an explicit direct PostgreSQL URL without loading local environment files', () => {
  const url = 'postgresql://test:unused@database.invalid/test'
  expect(ciDatabaseUrl({ CI: 'true', DATABASE_URL: url })).toBe(url)
  expect(() => ciDatabaseUrl({ DATABASE_URL: url })).toThrow('CI=true')
  expect(() => ciDatabaseUrl({ CI: 'true' })).toThrow('direct PostgreSQL')
  for (const value of [
    'file:///tmp/db',
    'not-a-url',
    'postgresql://test:unused@ep-test-pooler.eu.neon.tech/db'
  ])
    expect(() => ciDatabaseUrl({ CI: 'true', DATABASE_URL: value })).toThrow(
      'direct PostgreSQL'
    )
})

it('keeps the advisory lock, metadata upgrade, SQL and verification in one transaction', async () => {
  await migration(first, 'CREATE TABLE example (value int);')
  await initialize()
  await client.exec(`
    INSERT INTO example VALUES (42);
    ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN name;
    ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN applied_at;
  `)
  await migration(second, 'UPDATE example SET value = 99;')
  // Simulate a migrator that runs SQL but fails to retain its history entry.
  await client.exec(`
    CREATE RULE skip_migration_history AS ON INSERT TO drizzle.__drizzle_migrations
      DO INSTEAD NOTHING;
  `)
  await expect(migrateCi()).rejects.toThrow('pending migrations remain')
  expect((await client.query('SELECT * FROM example')).rows).toEqual([
    { value: 42 }
  ])
  expect(
    (
      await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'drizzle' AND column_name IN ('name', 'applied_at')
  `)
    ).rows
  ).toEqual([])
  await client.exec(
    'DROP RULE skip_migration_history ON drizzle.__drizzle_migrations'
  )
  expect(await migrateCi()).toEqual([second])
  expect((await client.query('SELECT * FROM example')).rows).toEqual([
    { value: 99 }
  ])
  expect(await migrateCi()).toEqual([])
})

it.each([false, true])(
  'rejects changed applied folder timestamps (legacy metadata: %s)',
  async (legacy) => {
    await migration(first, 'CREATE TABLE example (value int);')
    await initialize()
    if (legacy)
      await client.exec(`
        ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN name;
        ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN applied_at;
      `)
    const history = (
      await client.query('SELECT * FROM drizzle.__drizzle_migrations')
    ).rows
    await rename(join(directory, first), join(directory, second))
    await expect(migrateCi()).rejects.toThrow('changed')
    expect(
      (await client.query('SELECT * FROM drizzle.__drizzle_migrations')).rows
    ).toEqual(history)
  }
)

it('matches legacy timestamps at second precision even when SQL hashes repeat', async () => {
  await migration(first, 'SELECT 1;')
  await migration(second, 'SELECT 1;')
  await initialize()
  await client.exec(`
    ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN name;
    ALTER TABLE drizzle.__drizzle_migrations DROP COLUMN applied_at;
    UPDATE drizzle.__drizzle_migrations SET created_at = created_at + 123;
  `)
  expect(await migrateCi()).toEqual([])
  const third = '20260103000000_third'
  await migration(third, 'CREATE TABLE example (value int);')
  expect(await migrateCi()).toEqual([third])
  expect(
    (
      await client.query(
        'SELECT name FROM drizzle.__drizzle_migrations ORDER BY id'
      )
    ).rows
  ).toEqual([{ name: first }, { name: second }, { name: third }])
  expect(await migrateCi()).toEqual([])
})

it('stops before validation or migration when the advisory lock is unavailable', async () => {
  const execute = vi.fn(async () => ({ rows: [{ acquired: false }] }))
  const transaction = vi.fn(async (run) => run({ execute }))
  const database = { transaction } as unknown as Parameters<
    typeof migrateDatabase
  >[0]
  await expect(migrateDatabase(database, directory)).rejects.toThrow(
    'Another Allmaps migration is running'
  )
  expect(transaction).toHaveBeenCalledTimes(1)
  expect(execute).toHaveBeenCalledTimes(1)
})
