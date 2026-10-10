import { Elysia } from 'elysia'
import { afterEach, expect, test, vi } from 'vitest'
import type { Db } from '@allmaps/db'
import { createMapsRoutes } from '../src/routes/maps.js'
import { createTestAuth, env, request, sessionForRole } from './helpers.js'

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
    const { betterAuth, getSession } = createTestAuth(
      role === null ? null : sessionForRole(role)
    )
    const app = new Elysia()
      .decorate('db', {} as Db)
      .decorate('env', env)
      .use(createMapsRoutes(betterAuth))
    for (const [path, method] of [
      ['/maps', 'POST'],
      ['/maps/map-id', 'PATCH']
    ]) {
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
