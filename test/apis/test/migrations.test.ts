import { temporaryDirectory } from './helpers/context.ts'
import { mkdir, writeFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
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
