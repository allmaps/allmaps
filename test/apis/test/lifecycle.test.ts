import { temporaryDirectory, createTestContext } from './helpers/context.ts'
import { testEnvironmentFile } from './helpers/environment.ts'
import { allowTestPort } from './helpers/isolation.ts'
import { PGlite } from '@electric-sql/pglite'
import { connect } from 'node:net'
import { connect as connectTls } from 'node:tls'
import { execFile } from 'node:child_process'
import {
  defaultDataDirectory,
  migratePgliteDirectory,
  apiEnvironment
} from '@allmaps/tools-apis'
import { loadLocalEnvironment } from '@allmaps/tools-setup'
import ports from '../../../ports.json' with { type: 'json' }
import { writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const temporary: string[] = []
async function directory() {
  const path = await temporaryDirectory('lifecycle-')
  temporary.push(path)
  return path
}
afterEach(async () => {
  for (const path of temporary.splice(0))
    await rm(path, { recursive: true, force: true })
})

describe('local-only test setup', () => {
  it('ignores inherited database targets and keeps the test database in memory', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://unused.invalid/development')
    vi.stubEnv('DIRECT_DATABASE_URL', 'postgresql://unused.invalid/main')
    vi.stubEnv('PGLITE_DATA_DIR', defaultDataDirectory)
    let context: Awaited<ReturnType<typeof createTestContext>> | undefined
    try {
      context = await createTestContext()
      expect(context.client.dataDir).toBeUndefined()
      expect(context.env.DATABASE_URL).toBe('postgresql://localhost/pglite')
      expect((await context.client.query('SELECT 1 AS value')).rows).toEqual([
        { value: 1 }
      ])
    } finally {
      await context?.close()
      vi.unstubAllEnvs()
    }
  })

  it('rejects preserved database paths before opening them', async () => {
    await expect(migratePgliteDirectory(defaultDataDirectory)).rejects.toThrow(
      /temporary directory|No existing PGlite database/
    )
    await expect(
      createTestContext({ dataDir: defaultDataDirectory })
    ).rejects.toThrow('temporary directory')
    expect(() => PGlite.create({ dataDir: defaultDataDirectory })).toThrow(
      'temporary directory'
    )
    expect(() => PGlite.create(defaultDataDirectory)).toThrow(
      'temporary directory'
    )
    const path = await directory()
    for (const [name, destination] of [
      ['existing', defaultDataDirectory],
      ['dangling', '/does-not-exist-allmaps-api-test']
    ]) {
      const link = join(path, name)
      await symlink(destination, link)
      await expect(createTestContext({ dataDir: link })).rejects.toThrow(
        'temporary directory'
      )
    }
  })

  it('blocks external sockets, ordinary local services, and external commands', () => {
    expect(() => connect({ host: 'database.invalid', port: 5432 })).toThrow(
      'temporary local servers'
    )
    expect(() => connect({ host: '127.0.0.1', port: 5432 })).toThrow(
      'temporary local servers'
    )
    expect(() => connectTls({ host: 'database.invalid', port: 443 })).toThrow(
      'TLS'
    )
    expect(() => allowTestPort(ports.rest)).toThrow('development ports')
    expect(() => execFile('neonctl', ['branches', 'list'])).toThrow(
      'external commands'
    )
  })
})

describe('configuration', () => {
  it('does not initialize a nonempty directory containing unrelated files', async () => {
    const path = await directory()
    await writeFile(join(path, 'keep'), 'original')
    await expect(createTestContext({ dataDir: path })).rejects.toThrow(
      'must be empty'
    )
    expect(await readFile(join(path, 'keep'), 'utf8')).toBe('original')
    expect(await readdir(path)).toEqual(['keep'])
  })
  it('loads configuration once, respects shell precedence and isolates target cookies', async () => {
    const path = await directory()
    await writeFile(
      join(path, '.env.localhost'),
      (await readFile(testEnvironmentFile, 'utf8')) +
        'BETTER_AUTH_SECRET=base\nDATABASE_URL=postgresql://localhost/base\nPUBLIC_BANNER_TEXT=base\nPUBLIC_VIEWER_BASE_URL=http://localhost:5600\n'
    )
    await writeFile(
      join(path, '.env.localhost.local'),
      'BETTER_AUTH_SECRET=private\nPUBLIC_BANNER_TEXT=private\nPUBLIC_LIVE_BASE_URL=http://localhost:5597\n'
    )
    const env = loadLocalEnvironment(path, {
      BETTER_AUTH_SECRET: 'shell',
      PUBLIC_REST_BASE_URL: 'http://localhost:5599'
    })
    expect(env).toMatchObject({
      BETTER_AUTH_SECRET: 'shell',
      PUBLIC_BANNER_TEXT: 'private',
      PUBLIC_VIEWER_BASE_URL: 'http://localhost:5600',
      PUBLIC_LIVE_BASE_URL: 'http://localhost:5597',
      PUBLIC_REST_BASE_URL: 'http://localhost:5599'
    })
    const first = apiEnvironment(env, 'pglite', 'first')
    const second = apiEnvironment(env, 'pglite', 'second')
    expect(first.BETTER_AUTH_COOKIE_PREFIX).not.toBe(
      second.BETTER_AUTH_COOKIE_PREFIX
    )
    expect(first.PUBLIC_REST_BASE_URL).toBe(second.PUBLIC_REST_BASE_URL)
    expect(first.PUBLIC_BANNER_TEXT).toBe('private')
    expect(first.PUBLIC_VIEWER_BASE_URL).toBe('http://localhost:5600')
    const postgres = apiEnvironment(env, 'postgres', 'unused-local-path')
    expect(postgres.BETTER_AUTH_SECRET).toBe('shell')
    expect(postgres.DATABASE_URL).toBe('postgresql://localhost/base')
    expect(postgres.BETTER_AUTH_COOKIE_PREFIX).not.toBe(
      apiEnvironment(
        { ...env, DATABASE_URL: 'postgresql://localhost/other' },
        'postgres',
        'unused-local-path'
      ).BETTER_AUTH_COOKIE_PREFIX
    )
    expect(() =>
      apiEnvironment(
        { PUBLIC_REST_BASE_URL: 'https://api.allmaps.org' },
        'pglite',
        'first'
      )
    ).toThrow('localhost')
  })
})
