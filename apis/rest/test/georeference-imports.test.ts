import { Elysia } from 'elysia'
import { afterEach, expect, test, vi } from 'vitest'
import type { Db } from '@allmaps/db'
import type { RestEnv } from '@allmaps/env/rest'
import { createMapsRoutes } from '../src/routes/maps.js'
import { createTestAuth, env, request, sessionForRole } from './helpers.js'

const importSecret = 'test-live-import-secret-never-use-in-production'
const importRoutes = [
  ['/maps', 'POST'],
  ['/maps/map-id', 'PATCH']
] as const

function createImportApp(
  role: string | null,
  overrides: Partial<RestEnv> = {}
) {
  const { betterAuth, getSession } = createTestAuth(
    role === null ? null : sessionForRole(role)
  )
  const app = new Elysia()
    .decorate('db', {} as Db)
    .decorate('env', { ...env, LIVE_IMPORT_SECRET: importSecret, ...overrides })
    .use(createMapsRoutes(betterAuth))
  return { app, getSession }
}

afterEach(() => vi.unstubAllGlobals())

test.each([
  [null, 401],
  ['user', 401],
  ['collaborator', 401],
  ['admin', 200]
] as const)(
  'REST georeference imports require Admin: %s',
  async (role, status) => {
    const fetch = vi.fn(async () => Response.json({ success: true }))
    vi.stubGlobal('fetch', fetch)
    const { app, getSession } = createImportApp(role)
    for (const [path, method] of importRoutes) {
      expect(
        (await app.handle(request(path, { map: 'test' }, method))).status
      ).toBe(status)
    }
    expect(fetch).toHaveBeenCalledTimes(status === 200 ? 2 : 0)
    expect(getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    )
  }
)

test('forwards only the service credential and blocks redirects for both import routes', async () => {
  const fetch = vi.fn(async () => Response.json({ success: true }))
  vi.stubGlobal('fetch', fetch)
  const { app } = createImportApp('admin')
  for (const [path, method] of importRoutes) {
    const incoming = request(path, { map: 'test' }, method)
    incoming.headers.set('Cookie', 'allmaps.session_token=private-user-session')
    incoming.headers.set('Authorization', 'Bearer incoming-user-credential')
    const response = await app.handle(incoming)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(fetch).toHaveBeenLastCalledWith(
      new URL(`https://live.example${path}`),
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${importSecret}`
        },
        redirect: 'error',
        body: JSON.stringify({ map: 'test' })
      }
    )
  }
})

test.each([undefined, ''])(
  'disables imports without a configured secret: %s',
  async (secret) => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { app } = createImportApp('admin', { LIVE_IMPORT_SECRET: secret })
    for (const [path, method] of importRoutes) {
      const response = await app.handle(request(path, {}, method))
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({
        message: 'Georeference imports are not configured'
      })
    }
    expect(fetch).not.toHaveBeenCalled()
  }
)

test.each([
  'http://live.example',
  'http://localhost.example',
  'https://username:password@live.example'
])('does not send the secret to an unsafe Live URL: %s', async (url) => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const { app } = createImportApp('admin', { PUBLIC_LIVE_BASE_URL: url })
  expect((await app.handle(request('/maps', {}))).status).toBe(503)
  expect(fetch).not.toHaveBeenCalled()
})

test.each([
  'http://localhost:5497',
  'http://127.0.0.1:5497',
  'http://[::1]:5497'
])('supports local HTTP imports: %s', async (url) => {
  const fetch = vi.fn(async () => Response.json({ success: true }))
  vi.stubGlobal('fetch', fetch)
  const { app } = createImportApp('admin', { PUBLIC_LIVE_BASE_URL: url })
  expect((await app.handle(request('/maps', {}))).status).toBe(200)
  expect(fetch).toHaveBeenCalledOnce()
})

test.each([
  [401, 502],
  [403, 502],
  [503, 503]
])(
  'reports a Live authentication/configuration failure: %s',
  async (liveStatus, restStatus) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: 'Unavailable' }, { status: liveStatus })
      )
    )
    const { app } = createImportApp('admin')
    expect((await app.handle(request('/maps', {}))).status).toBe(restStatus)
  }
)
