import { rm, cp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { parseAnnotation } from '@allmaps/annotation'
import {
  apiEnvironment,
  defaultDataDirectory,
  migrationsDirectory,
  type RunnerConfiguration
} from '@allmaps/tools-apis'
import type { SeedCatalog } from '@allmaps/tools-seed'
import { startTestRunner, temporaryDirectory } from './helpers/context.ts'
import { startRunner } from './helpers/runner.ts'
import { createTestEnvironment } from './helpers/environment.ts'

let directory: string
let configuration: RunnerConfiguration
let runner: ReturnType<typeof startTestRunner> | undefined
let catalog: SeedCatalog
let sessionCookie: string

async function unusedPort() {
  const server = createServer()
  server.listen(0, 'localhost')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test port')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}
const rest = (path: string, init?: RequestInit) =>
  fetch(`${configuration.environment.PUBLIC_REST_BASE_URL}${path}`, init)

beforeAll(async () => {
  directory = await temporaryDirectory('node-')
  const env = createTestEnvironment()
  for (const name of ['REST', 'ANNOTATIONS', 'LIVE'])
    env[`PUBLIC_${name}_BASE_URL`] = `http://localhost:${await unusedPort()}`
  await cp(migrationsDirectory, join(directory, 'migrations'), {
    recursive: true
  })
  configuration = {
    database: 'pglite',
    dataDir: join(directory, 'database'),
    environment: apiEnvironment(env, 'pglite', directory),
    migrationsDirectory: join(directory, 'migrations'),
    fixturePort: await unusedPort(),
    reuseFixtureServer: false
  }
  runner = startTestRunner(configuration)
  expect(await runner.ready, runner.output).toBe(true)
  catalog = await (await rest('/__dev/seed')).json()
}, 60000)

afterAll(async () => {
  await runner?.stop()
  if (directory) await rm(directory, { recursive: true, force: true })
}, 30000)

it('runs native TypeScript on Node, serves all APIs and owns a reusable IIIF fixture listener', async () => {
  expect((await rest('/maps')).status).toBe(200)
  expect(
    (await fetch(configuration.environment.PUBLIC_LIVE_BASE_URL!)).status
  ).toBe(200)
  for (const hostname of ['localhost', '127.0.0.1']) {
    const fixture = await fetch(
      `http://${hostname}:${configuration.fixturePort}/cors/iiif/3/level2/4f4a289db37a73f2/info.json`
    )
    expect(fixture.status).toBe(200)
    expect((await fixture.json()).width).toBeGreaterThan(1000)
  }
  // Follow the actual seeded URLs: they must point to this test's server,
  // including fixtures using the second organization's 127.0.0.1 hostname.
  for (const image of catalog.images) {
    expect(Number(new URL(image.uri).port)).toBe(configuration.fixturePort)
    expect((await fetch(`${image.uri}/info.json`)).status).toBe(200)
    const pixels = await fetch(`${image.uri}/full/256,/0/default.jpg`)
    expect(pixels.status).toBe(200)
    expect(pixels.headers.get('content-type')).toBe('image/jpeg')
    expect((await pixels.arrayBuffer()).byteLength).toBeGreaterThan(1000)
  }
})

it('rejects PostgreSQL, preserved storage, and fixture reuse inside the child process', async () => {
  // Exercise the preloader itself, bypassing the parent helper's validation.
  // Invalid configurations must exit before opening any database or listener.
  const ports = [
    ...['REST', 'ANNOTATIONS', 'LIVE'].map((name) =>
      Number(
        new URL(configuration.environment[`PUBLIC_${name}_BASE_URL`]!).port
      )
    ),
    configuration.fixturePort!
  ]
  for (const invalid of [
    { ...configuration, database: 'postgres' as const },
    { ...configuration, dataDir: defaultDataDirectory },
    { ...configuration, reuseFixtureServer: true }
  ]) {
    const rejected = startRunner(invalid, ports)
    try {
      expect(await rejected.ready).toBe(false)
      expect(await rejected.exited).not.toBe(0)
    } finally {
      await rejected.stop()
    }
  }
})
it('preserves every HTTP authentication cookie and scopes login to the database target', async () => {
  const response = await rest('/auth/sign-in/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
  expect(response.status).toBe(200)
  const cookies = response.headers.getSetCookie()
  expect(
    cookies.some((cookie) =>
      cookie.startsWith(
        `${configuration.environment.BETTER_AUTH_COOKIE_PREFIX}.session_token=`
      )
    )
  ).toBe(true)
  expect(cookies.some((cookie) => cookie.includes('.session_data='))).toBe(true)
  const login = await rest('/__dev/login/local-editor', { method: 'POST' })
  expect(login.status).toBe(200)
  expect((await login.json()).slug).toBe('local-editor')
  sessionCookie = login.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
  expect(sessionCookie).toContain('.session_token=')
  expect(
    (await rest('/lists', { headers: { Cookie: sessionCookie } })).status
  ).toBe(200)
})
it('flushes a WebSocket edit into REST and Annotations before restart, retaining the session and history', async () => {
  const map = catalog.maps[0]
  const websocket = new WebSocket(
    configuration.environment.PUBLIC_LIVE_BASE_URL!.replace('http:', 'ws:')
  )
  const messages: Record<string, unknown>[] = []
  const waiting: (() => void)[] = []
  websocket.on('message', (data) => {
    messages.push(JSON.parse(data.toString()))
    waiting.splice(0).forEach((resolve) => resolve())
  })
  const next = async (action: string) => {
    for (;;) {
      const index = messages.findIndex((message) => message.a === action)
      if (index >= 0) return messages.splice(index, 1)[0]
      await new Promise<void>((resolve) => waiting.push(resolve))
    }
  }
  await once(websocket, 'open')
  websocket.send(JSON.stringify({ a: 'f', c: 'images', d: map.imageId }))
  const fetched = await next('f')
  const snapshot = fetched.data as {
    v: number
    data: Record<string, { resourceMask: number[][] }>
  }
  const original = snapshot.data[map.id].resourceMask[0][0]
  websocket.send(
    JSON.stringify({
      a: 'op',
      c: 'images',
      d: map.imageId,
      v: snapshot.v,
      src: randomUUID(),
      seq: 1,
      op: [map.id, 'resourceMask', 0, 0, { r: original, i: original + 1 }]
    })
  )
  const acknowledgment = await next('op')
  expect(acknowledgment.error).toBeUndefined()
  const closed = once(websocket, 'close')
  await runner!.stop('SIGINT')
  expect((await closed)[0]).toBe(1012)
  runner = startTestRunner(configuration)
  expect(await runner.ready, runner.output).toBe(true)
  const updated = await (await rest(`/maps/${map.id}`)).json()
  expect(updated.resourceMask[0][0]).toBe(original + 1)
  const annotation = await (
    await fetch(
      `${configuration.environment.PUBLIC_ANNOTATIONS_BASE_URL}/maps/${map.id}`
    )
  ).json()
  expect(parseAnnotation(annotation)[0].resourceMask[0][0]).toBe(original + 1)
  expect((await (await rest(`/maps/${map.id}/versions`)).json()).length).toBe(
    map.initialVersions + 1
  )
  expect(
    (await rest('/lists', { headers: { Cookie: sessionCookie } })).status
  ).toBe(200)
}, 60000)

it('refuses pending migrations on an existing database, even after SQL is corrected', async () => {
  await runner!.stop()
  const migration = join(
    configuration.migrationsDirectory!,
    '20990101000000_native_test'
  )
  await mkdir(migration)
  await writeFile(join(migration, 'snapshot.json'), '{}')
  await writeFile(
    join(migration, 'migration.sql'),
    'CREATE TABLE native_test (id int); SELECT invalid_column;'
  )
  runner = startTestRunner(configuration)
  expect(await runner.ready).toBe(false)
  expect(runner.output).toContain('missing local migrations')
  await expect(rest('/maps')).rejects.toThrow()
  await writeFile(
    join(migration, 'migration.sql'),
    'CREATE TABLE native_test (id int); INSERT INTO native_test VALUES (1);'
  )
  runner = startTestRunner(configuration)
  expect(await runner.ready).toBe(false)
  expect(runner.output).toContain('missing local migrations')
  const client = await PGlite.create({
    dataDir: configuration.dataDir,
    extensions: { postgis }
  })
  try {
    expect(
      (await client.query("SELECT to_regclass('native_test') AS name")).rows
    ).toEqual([{ name: null }])
  } finally {
    await client.close()
  }
}, 60000)

it('rolls back failed initialization and initializes a new directory without replacing the old database', async () => {
  const migration = join(
    configuration.migrationsDirectory!,
    '20990101000000_native_test/migration.sql'
  )
  const dataDir = join(directory, 'fresh-database')
  await writeFile(
    migration,
    'CREATE TABLE native_test (id int); SELECT invalid_column;'
  )
  runner = startTestRunner({ ...configuration, dataDir })
  expect(await runner.ready).toBe(false)
  expect(runner.output).toContain('invalid_column')
  await writeFile(
    migration,
    'CREATE TABLE native_test (id int); INSERT INTO native_test VALUES (1);'
  )
  runner = startTestRunner({ ...configuration, dataDir })
  expect(await runner.ready, runner.output).toBe(true)
  expect((await (await rest('/maps')).json()).length).toBe(3)
  await runner.stop()
  const original = await PGlite.create({
    dataDir: configuration.dataDir,
    extensions: { postgis }
  })
  try {
    expect(
      (await original.query("SELECT to_regclass('native_test') AS name")).rows
    ).toEqual([{ name: null }])
    expect(
      (
        await original.query(
          'SELECT count(*)::int AS count FROM maps WHERE latest'
        )
      ).rows
    ).toEqual([{ count: 3 }])
  } finally {
    await original.close()
  }
}, 60000)

it('finishes initialization when SIGTERM arrives before opening listeners', async () => {
  const dataDir = join(directory, 'interrupted-initialization')
  const initializing = startTestRunner({
    ...configuration,
    dataDir,
    seedOnly: true
  })
  expect(await initializing.initializing).toBe(true)
  await initializing.stop()
  expect(await initializing.ready).toBe(false)
  expect(await initializing.exited, initializing.output).toBe(0)
  const client = await PGlite.create({ dataDir, extensions: { postgis } })
  try {
    expect((await client.query('SELECT id FROM native_test')).rows).toEqual([
      { id: 1 }
    ])
  } finally {
    await client.close()
  }
}, 60000)
