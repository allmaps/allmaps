import { Elysia } from 'elysia'
import { beforeEach, expect, test, vi } from 'vitest'
import type { Db } from '@allmaps/db'
import { setUserRole } from '@allmaps/api-shared/db'
import { createApp } from '../src/app.js'
import { createTestAuth, env, sessionForRole } from './helpers.js'

vi.mock('@allmaps/api-shared/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@allmaps/api-shared/db')>()),
  setUserRole: vi.fn(async (_db, id, role) => ({ id, role }))
}))

beforeEach(() => vi.clearAllMocks())

function setup() {
  const { betterAuth } = createTestAuth(sessionForRole('admin'))
  Object.assign(betterAuth.auth, { handler: () => new Response(null) })
  return new Elysia()
    .decorate('db', {} as Db)
    .decorate('env', env)
    .use(createApp(env, betterAuth))
}

function roleRequest(origin?: string) {
  return new Request('https://api.example/users/target/role', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: 'better-auth.session_token=admin',
      ...(origin ? { origin } : {})
    },
    body: JSON.stringify({ role: 'collaborator' })
  })
}

test('rejects a credentialed role change from an untrusted sibling origin', async () => {
  const response = await setup().handle(roleRequest('https://evil.allmaps.org'))
  expect(response.status).toBe(403)
  expect(setUserRole).not.toHaveBeenCalled()
})

test.each(['https://api.example', 'https://console.allmaps.org', undefined])(
  'allows a role change from trusted or server-side origin %s',
  async (origin) => {
    const response = await setup().handle(roleRequest(origin))
    expect(response.status).toBe(200)
    expect(setUserRole).toHaveBeenCalledOnce()
  }
)

test('public CORS remains available but untrusted origins cannot use credentials', async () => {
  const app = setup()
  for (const [origin, credentials] of [
    ['https://evil.allmaps.org', null],
    ['https://console.allmaps.org', 'true']
  ] as const) {
    const response = await app.handle(
      new Request('https://api.example/users/target/role', {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': 'PATCH',
          'access-control-request-headers': 'content-type'
        }
      })
    )
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    expect(response.headers.get('access-control-allow-credentials')).toBe(
      credentials
    )
  }
})

test('rejects a cross-site browser mutation without an Origin header', async () => {
  const request = roleRequest()
  request.headers.set('sec-fetch-site', 'cross-site')
  const response = await setup().handle(request)
  expect(response.status).toBe(403)
  expect(setUserRole).not.toHaveBeenCalled()
})
