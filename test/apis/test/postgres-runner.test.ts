import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { parseAnnotation } from '@allmaps/annotation'
import { getPgContext, type Db } from '@allmaps/db'
import { apiEnvironment, createPostgresContext } from '@allmaps/tools-apis'
import { createTestEnvironment } from './helpers/environment.ts'
import {
  createTestContext,
  temporaryDirectory,
  type TestContext
} from './helpers/context.ts'

// Exercise PostgreSQL-mode wiring against PGlite, with no network database.
// The real pg pool itself is covered separately in pg.test.ts.
const fixture = vi.hoisted(() => ({
  database: undefined as
    | {
        db: Db
        pool: {
          query: (
            query: string,
            values?: unknown[]
          ) => Promise<{ rows: Record<string, unknown>[] }>
        }
        close: () => Promise<void>
      }
    | undefined
}))
vi.mock('@allmaps/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@allmaps/db')>()),
  getPgContext: vi.fn(() => {
    if (!fixture.database) throw new Error('Test database is not initialized')
    return fixture.database
  })
}))

describe('one database pool for the combined API runner', () => {
  const environment = apiEnvironment(
    createTestEnvironment({
      DATABASE_URL: 'postgresql://localhost/unused',
      BETTER_AUTH_SECRET: 'postgres-runner-test-only-secret'
    }),
    'postgres',
    'unused-path'
  )
  let backing: TestContext
  let dataDir: string
  let backingClosed: boolean
  let runner: Awaited<ReturnType<typeof createPostgresContext>> | undefined
  let close: ReturnType<typeof vi.fn<() => Promise<void>>>

  beforeEach(async () => {
    dataDir = await temporaryDirectory('postgres-runner-')
    backing = await createTestContext({ dataDir, seed: 'map' })
    backingClosed = false
    close = vi.fn(async () => {
      backingClosed = true
      await backing.close()
    })
    fixture.database = {
      db: backing.db,
      pool: {
        query: vi.fn(async (query: string, values?: unknown[]) => {
          expect(query).toMatch(/^SELECT /)
          return backing.client.query<Record<string, unknown>>(query, values)
        })
      },
      close
    }
    vi.mocked(getPgContext).mockClear()
  })

  async function closeRunner() {
    const current = runner
    runner = undefined
    await current?.close()
  }

  afterEach(async () => {
    try {
      await closeRunner()
    } finally {
      if (!backingClosed) await backing?.close()
      fixture.database = undefined
      vi.restoreAllMocks()
    }
  })

  it('creates one pool for migration checks, both HTTP APIs, authentication and Live', async () => {
    runner = await createPostgresContext(environment)
    expect(getPgContext).toHaveBeenCalledExactlyOnceWith(
      environment.DATABASE_URL,
      { logger: runner.env.LOG_QUERIES }
    )
    expect(fixture.database!.pool.query).toHaveBeenCalled()
    expect(runner.rest.decorator.db).toBe(backing.db)
    expect(runner.annotations.decorator.db).toBe(backing.db)
    expect(runner.shareDb.db).toBe(backing.db)
    const maps = await runner.rest.handle(
      new Request(`${runner.env.PUBLIC_REST_BASE_URL}/maps`)
    )
    expect(maps.status).toBe(200)
    const [map] = await maps.json()
    const mapId = map.id.split('/').at(-1)
    const annotations = await runner.annotations.handle(
      new Request(`${runner.env.PUBLIC_ANNOTATIONS_BASE_URL}/maps/${mapId}`)
    )
    expect(annotations.status).toBe(200)
    expect(parseAnnotation(await annotations.json())).toHaveLength(1)
    const login = await runner.rest.handle(
      new Request(`${runner.env.PUBLIC_REST_BASE_URL}/auth/sign-in/anonymous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
    )
    expect(login.status).toBe(200)
    const cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    const session = await runner.annotations.handle(
      new Request(
        `${runner.env.PUBLIC_ANNOTATIONS_BASE_URL}/auth/get-session`,
        {
          headers: { Cookie: cookie }
        }
      )
    )
    expect(session.status).toBe(200)
    expect((await session.json()).user.isAnonymous).toBe(true)
    expect(getPgContext).toHaveBeenCalledTimes(1)
  })

  it('closes the pool if the read-only migration check fails', async () => {
    vi.spyOn(fixture.database!.pool, 'query').mockRejectedValueOnce(
      new Error('migration lookup failed')
    )
    await expect(createPostgresContext(environment)).rejects.toThrow(
      'migration lookup failed'
    )
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('closes the pool after Live, including when Live reports a persistence failure', async () => {
    runner = await createPostgresContext(environment)
    const finishLive = runner.shareDb.close.bind(runner.shareDb)
    vi.spyOn(runner.shareDb, 'close').mockImplementation(async () => {
      expect(close).not.toHaveBeenCalled()
      await finishLive()
      throw new Error('Live persistence failed')
    })
    await expect(closeRunner()).rejects.toThrow('Live persistence failed')
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('rolls back dependent writes without affecting later API reads', async () => {
    runner = await createPostgresContext(environment)
    const before = await backing.client.query(
      'SELECT id, latest FROM maps ORDER BY id'
    )
    await expect(
      runner.shareDb.db.transaction(async (transaction) => {
        await transaction.execute(sql`UPDATE maps SET latest = false`)
        await transaction.execute(sql`UPDATE iiif.images SET width = 123`)
        throw new Error('abort edit')
      })
    ).rejects.toThrow('abort edit')
    expect(
      (await backing.client.query('SELECT id, latest FROM maps ORDER BY id'))
        .rows
    ).toEqual(before.rows)
    expect(
      (await backing.client.query('SELECT width FROM iiif.images')).rows
    ).toEqual([{ width: 1000 }])
    const response = await runner.rest.handle(
      new Request(`${runner.env.PUBLIC_REST_BASE_URL}/maps`)
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toHaveLength(1)
  })

  it('flushes concurrent Live edits before closing the pool and retains them on restart', async () => {
    runner = await createPostgresContext(environment)
    const {
      rows: [map]
    } = await backing.client.query<{ id: string; image_id: string }>(
      'SELECT id, image_id FROM maps WHERE latest'
    )
    const connections = [
      runner.shareDb.shareDb.connect(),
      runner.shareDb.shareDb.connect()
    ]
    const documents = connections.map((connection) =>
      connection.get('images', map.image_id)
    )
    try {
      await Promise.all(
        documents.map(
          (document) =>
            new Promise<void>((resolve, reject) => {
              document.fetch((error) => (error ? reject(error) : resolve()))
            })
        )
      )
      const version = documents[0].version!
      await Promise.all(
        documents.map(
          (document, index) =>
            new Promise<void>((resolve, reject) => {
              document.submitOp(
                [
                  map.id,
                  'resourceMask',
                  index * 2,
                  0,
                  { r: index * 1000, i: index * 1000 + index + 1 }
                ],
                {},
                (error) => (error ? reject(error) : resolve())
              )
            })
        )
      )
      await closeRunner()
      expect(close).toHaveBeenCalledTimes(1)
      const reopened = await createTestContext({ dataDir })
      try {
        const snapshot = await reopened.client.query<{ version: number }>(
          'SELECT version FROM snapshots WHERE doc_id = $1',
          [map.image_id]
        )
        expect(snapshot.rows[0].version).toBe(version + 2)
        const operations = await reopened.client.query<{ count: number }>(
          'SELECT count(*)::int FROM ops WHERE doc_id = $1',
          [map.image_id]
        )
        expect(operations.rows[0].count).toBe(version + 2)
        const rest = await reopened.rest.handle(
          new Request(`${reopened.env.PUBLIC_REST_BASE_URL}/maps/${map.id}`)
        )
        expect(rest.status).toBe(200)
        const mask = (await rest.json()).resourceMask
        expect(mask[0]).toEqual([1, 0])
        expect(mask[2]).toEqual([1002, 1000])
        const annotations = await reopened.annotations.handle(
          new Request(
            `${reopened.env.PUBLIC_ANNOTATIONS_BASE_URL}/maps/${map.id}`
          )
        )
        expect(annotations.status).toBe(200)
        expect(
          parseAnnotation(await annotations.json())[0].resourceMask
        ).toEqual(mask)
      } finally {
        await reopened.close()
      }
    } finally {
      for (const connection of connections) connection.close()
    }
  })
})
