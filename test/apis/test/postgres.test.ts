import { describe, expect, it, vi } from 'vitest'
import { getPgContext } from '@allmaps/db'
import { parseRestEnv } from '@allmaps/env/rest'
import { parseDataExportEnv } from '@allmaps/env/data-export'
import { apiEnvironment, createPostgresContext } from '@allmaps/tools-apis'
import { postgresTarget, safeError } from '@allmaps/tools-setup'
import { createTestEnvironment } from './helpers/environment.ts'

vi.mock('@allmaps/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@allmaps/db')>()),
  getPgContext: vi.fn(() => {
    throw new Error('PostgreSQL connections disabled in tests')
  })
}))

const source = {
  ...createTestEnvironment(),
  DATABASE_URL: 'postgresql://developer:secret@database.invalid/maps',
  BETTER_AUTH_SECRET: 'test-only-authentication-secret'
}
const environment = (overrides: Record<string, string | undefined> = {}) =>
  apiEnvironment({ ...source, ...overrides }, 'postgres', 'unused-local-path')

describe('PostgreSQL target configuration', () => {
  it.each([
    'postgres://developer:secret@localhost:5432/maps',
    'postgresql://developer:secret@[::1]:5432/maps',
    'postgresql://developer:secret@database.invalid/maps?sslmode=require',
    'postgresql://developer:secret@feature.neon.tech/maps?sslmode=require'
  ])('uses DATABASE_URL unchanged for %s', (databaseUrl) => {
    expect(environment({ DATABASE_URL: databaseUrl }).DATABASE_URL).toBe(
      databaseUrl
    )
  })

  it('ignores legacy connection variables in the API and export configuration', () => {
    const env = environment({
      DIRECT_DATABASE_URL: 'postgresql://unused.invalid/main',
      NEON_PROJECT_ID: 'unused-project',
      NEON_DATABASE_NAME: 'unused-database'
    })
    expect(env.DATABASE_URL).toBe(source.DATABASE_URL)
    expect(parseRestEnv(env)).not.toHaveProperty('DIRECT_DATABASE_URL')
    const exportEnv = parseDataExportEnv(env)
    expect(exportEnv.DATABASE_URL).toBe(source.DATABASE_URL)
    expect(exportEnv).not.toHaveProperty('DIRECT_DATABASE_URL')
    expect(() =>
      parseDataExportEnv({ DIRECT_DATABASE_URL: source.DATABASE_URL })
    ).toThrow('DATABASE_URL')
    expect(() =>
      environment({
        DATABASE_URL: undefined,
        DIRECT_DATABASE_URL: source.DATABASE_URL
      })
    ).toThrow('Set DATABASE_URL')
  })

  it('requires DATABASE_URL and an explicit authentication secret', () => {
    expect(() => environment({ DATABASE_URL: undefined })).toThrow(
      'Set DATABASE_URL'
    )
    expect(() => environment({ BETTER_AUTH_SECRET: undefined })).toThrow(
      'Set BETTER_AUTH_SECRET'
    )
  })

  it.each([
    '',
    'not-a-url-secret',
    'https://developer:secret@database.invalid/maps',
    'postgresql:///maps',
    'postgresql://database.invalid',
    'postgresql://database.invalid/maps#secret'
  ])(
    'rejects invalid target %j without exposing credentials',
    (databaseUrl) => {
      try {
        postgresTarget(databaseUrl)
        expect.fail('Expected an invalid connection URL to be rejected')
      } catch (error) {
        expect((error as Error).message).toContain('DATABASE_URL')
        if (databaseUrl.includes('secret'))
          expect((error as Error).message).not.toContain('secret')
      }
    }
  )

  it('labels connections without credentials or query parameters', () => {
    const databaseUrl =
      'postgresql://developer:secret@database.invalid:5433/maps?password=another-secret&sslmode=require'
    expect(postgresTarget(databaseUrl)).toEqual({
      databaseUrl,
      label: 'database.invalid:5433/maps'
    })
    expect(safeError(new Error(`Failed to connect to ${databaseUrl}`))).toBe(
      'Failed to connect to [database connection]'
    )
  })

  it('keeps cookies separate for different PostgreSQL targets', () => {
    const cookie = environment().BETTER_AUTH_COOKIE_PREFIX
    for (const databaseUrl of [
      'postgresql://developer:secret@other.invalid/maps',
      'postgresql://developer:secret@database.invalid/other',
      'postgresql://another-role:secret@database.invalid/maps',
      `${source.DATABASE_URL}?options=endpoint%3Dother`
    ])
      expect(
        environment({ DATABASE_URL: databaseUrl }).BETTER_AUTH_COOKIE_PREFIX
      ).not.toBe(cookie)
    expect(cookie).not.toContain('secret')
  })

  it('ignores PostgreSQL settings in PGlite mode', () => {
    const env = apiEnvironment(
      createTestEnvironment({
        DATABASE_URL: 'not-a-postgres-url',
        DIRECT_DATABASE_URL: 'invalid'
      }),
      'pglite',
      'temporary-local-target'
    )
    expect(env.DATABASE_URL).toBe('postgresql://localhost/pglite')
    expect(parseRestEnv(env)).not.toHaveProperty('DIRECT_DATABASE_URL')
    expect(env.BETTER_AUTH_SECRET).toBeTruthy()
  })

  it('passes DATABASE_URL to the shared pg helper without opening a real connection', async () => {
    const env = environment({
      LOG_QUERIES: 'true',
      GITHUB_CLIENT_ID: 'test-client',
      GITHUB_CLIENT_SECRET: 'test-secret',
      DIRECT_DATABASE_URL: 'postgresql://unused.invalid/main'
    })
    await expect(createPostgresContext(env)).rejects.toThrow(
      'PostgreSQL connections disabled in tests'
    )
    expect(getPgContext).toHaveBeenCalledWith(source.DATABASE_URL, {
      logger: true
    })
  })
})
