import { expect, test } from 'vitest'
import { parseLiveEnv } from '@allmaps/env/live'
import { parseRestEnv } from '@allmaps/env/rest'
import { liveImportEnvSchema } from '../../../packages/env/src/fragments/live-import.js'

test.each([undefined, '', '   '])(
  'allows imports to remain disabled: %s',
  (secret) => {
    const env = liveImportEnvSchema.parse({ LIVE_IMPORT_SECRET: secret })
    expect(Boolean(env.LIVE_IMPORT_SECRET)).toBe(false)
  }
)

test('preserves a sufficiently long service secret', () => {
  const secret = 'test-live-import-secret-never-use-in-production'
  expect(
    liveImportEnvSchema.parse({ LIVE_IMPORT_SECRET: secret }).LIVE_IMPORT_SECRET
  ).toBe(secret)
})

test.each(['short', ' '.repeat(32) + 'short'])(
  'rejects a short configured secret',
  (secret) => {
    expect(
      liveImportEnvSchema.safeParse({ LIVE_IMPORT_SECRET: secret }).success
    ).toBe(false)
  }
)

const environment = {
  NODE_VERSION: '24',
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  PUBLIC_TILE_SERVER_BASE_URL: 'https://tiles.example',
  PUBLIC_TILE_VIEWER_BASE_URL: 'https://tileviewer.example',
  PUBLIC_PREVIEW_BASE_URL: 'https://preview.example',
  PUBLIC_VIEWER_BASE_URL: 'https://viewer.example',
  PUBLIC_REST_BASE_URL: 'https://rest.example',
  PUBLIC_ANNOTATIONS_BASE_URL: 'https://annotations.example',
  PUBLIC_LIVE_BASE_URL: 'https://live.example',
  BETTER_AUTH_URL: 'https://rest.example',
  BETTER_AUTH_SECRET: 'test-auth-secret',
  BETTER_AUTH_COOKIE_PREFIX: 'test'
}

test.each([
  ['Live', parseLiveEnv],
  ['REST', parseRestEnv]
] as const)(
  '%s preserves the import secret when parsing its full environment',
  (_name, parse) => {
    const secret = 'test-live-import-secret-never-use-in-production'
    expect(
      parse({ ...environment, LIVE_IMPORT_SECRET: secret }).LIVE_IMPORT_SECRET
    ).toBe(secret)
    expect(parse(environment).LIVE_IMPORT_SECRET).toBeUndefined()
  }
)
