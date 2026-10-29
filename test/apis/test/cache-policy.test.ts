import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createElysia } from '@allmaps/api-shared/elysia'
import { createAuth } from '@allmaps/db/auth'
import type { Db } from '@allmaps/db'
import { applyCachePolicy } from '../../../packages/api-shared/src/elysia/cache-policy.ts'
import { fetchWithPublicCache } from '../../../packages/api-shared/src/response-cache.ts'
import { createRequestDatabase } from '../../../packages/db/src/request.ts'
import { createApp as createRestApp } from '../../../apis/rest/src/app.ts'
import { createApp as createAnnotationsApp } from '../../../apis/annotations/src/app.ts'
import { nodeAdapter } from '../../../tools/apis/src/node-adapter.ts'
import { createTestContext, type TestContext } from './helpers/context.ts'
import { createResponseCache } from './helpers/response-cache.ts'

const short = 'public, max-age=30, s-maxage=30'
const medium = 'public, max-age=60, s-maxage=300'
const long =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
const privatePolicy = 'private, no-store'

// Explicit inventory: adding a GET endpoint requires a cache-policy decision.
const publicRoutes = {
  rest: {
    '/': short,
    '/maps': short,
    '/maps.geojson': short,
    '/maps/:mapId': medium,
    '/maps/:mapId/versions': medium,
    '/images': short,
    '/images/:imageId': medium,
    '/images/:imageId/versions': medium,
    '/images/:imageId/maps': medium,
    '/images/:imageId/maps.geojson': medium,
    '/canvases': short,
    '/canvases/:canvasId': medium,
    '/canvases/:canvasId/maps': medium,
    '/canvases/:canvasId/maps.geojson': medium,
    '/manifests': short,
    '/manifests/:manifestId': medium,
    '/manifests/:manifestId/maps': medium,
    '/manifests/:manifestId/maps.geojson': medium,
    '/organizations': medium,
    '/organizations.geojson': medium,
    '/organizations/:organizationId': medium,
    '/organizations/:organizationId/images': short,
    '/organizations/:organizationId/canvases': short,
    '/organizations/:organizationId/manifests': short,
    '/projections': long,
    '/projections/:projectionId': long
  },
  annotations: {
    '/': short,
    '/maps': short,
    '/maps.geojson': short,
    '/maps/:mapId': medium,
    '/images/:imageId': medium,
    '/canvases/:canvasId': medium,
    '/manifests/:manifestId': medium,
    '/organizations/:organizationSlug': medium
  }
}
const privateRoutes = {
  rest: [
    '/openapi.json',
    '/images/random',
    '/canvases/random',
    '/manifests/random',
    '/lists',
    '/lists/:listId',
    '/users',
    '/users/:userId',
    '/organizations/:organizationId/users',
    '/login/:provider',
    '/logout'
  ],
  annotations: [
    '/openapi.json',
    '/maps/random',
    '/@:username/lists',
    '/@:username/lists/:listId',
    '/@:username/lists/:listId/georeference-annotations',
    '/login/:provider',
    '/logout'
  ]
}

it.each([
  '/auth/get-session',
  '/login',
  '/login/github',
  '/login/google',
  '/login/oidc',
  '/logout'
])(
  'overrides accidental public policies on authentication route %s',
  (path) => {
    const headers = new Headers({ 'Cache-Control': medium })
    applyCachePolicy(new Request(`https://api.example${path}`), 200, headers)
    expect(headers.get('Cache-Control')).toBe(privatePolicy)
  }
)

describe('cache policies for every REST and annotations endpoint', () => {
  let context: TestContext
  const database = createRequestDatabase<Db>()
  let apps: {
    rest: ReturnType<typeof makeRest>
    annotations: ReturnType<typeof makeAnnotations>
  }
  let replacements: Record<string, string>
  let cookie: string
  let checksum: string
  let imageChecksum: string
  const makeRest = (ctx: TestContext) =>
    createElysia({ adapter: nodeAdapter() })
      .decorate('env', ctx.env)
      .derive(() => ({ db: database.db }))
      .use(createRestApp(ctx.env, createAuth(ctx.env, database.db)))
  const makeAnnotations = (ctx: TestContext) =>
    createElysia({ adapter: nodeAdapter() })
      .decorate('env', ctx.env)
      .derive(() => ({ db: database.db }))
      .use(createAnnotationsApp(ctx.env, createAuth(ctx.env, database.db)))

  beforeAll(async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('Cache tests must not access the network')
    })
    context = await createTestContext({ seed: 'demo' })
    apps = { rest: makeRest(context), annotations: makeAnnotations(context) }
    const catalog = context.seedCatalog!
    const map = catalog.maps[0]
    const versions = await context.client.query<{
      checksum: string
      image_checksum: string
    }>('SELECT checksum, image_checksum FROM maps WHERE id = $1 AND latest', [
      map.id
    ])
    checksum = versions.rows[0].checksum
    imageChecksum = versions.rows[0].image_checksum
    replacements = {
      mapId: map.id,
      imageId: catalog.images[0].id,
      canvasId: catalog.images[0].canvasId,
      manifestId: catalog.manifests[0].id,
      organizationId: catalog.organizations[0].id,
      organizationSlug: catalog.organizations[0].slug,
      username: 'local-admin',
      userId: catalog.users[0].id,
      listId: catalog.lists.find((list) => list.userId === catalog.users[0].id)!
        .id,
      projectionId: 'EPSG:3857'
    }
    const login = await context.rest.handle(
      new Request(
        `${context.env.PUBLIC_REST_BASE_URL}/__dev/login/local-admin`,
        { method: 'POST' }
      )
    )
    expect(login.status).toBe(200)
    cookie = login.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    // Use a real projection ID, without assuming the registry's identifier scheme.
    const projections = await (await request('rest', '/projections')).json()
    replacements.projectionId = new URL(projections[0].id).pathname
      .split('/')
      .at(-1)!
  })
  afterAll(async () => {
    try {
      await context?.close()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  function resolve(path: string) {
    return path.replace(/:([A-Za-z]+)/g, (_, name) => replacements[name])
  }
  function request(
    api: 'rest' | 'annotations',
    path: string,
    init?: RequestInit
  ) {
    const base =
      api === 'rest'
        ? context.env.PUBLIC_REST_BASE_URL
        : context.env.PUBLIC_ANNOTATIONS_BASE_URL
    return database.run(context.db, () =>
      apps[api].handle(new Request(base + resolve(path), init))
    )
  }
  for (const api of ['rest', 'annotations'] as const) {
    it(`${api}: inventories all registered GET routes`, () => {
      const actual = apps[api].routes
        .filter((r) => r.method === 'GET')
        .map((r) => r.path)
        .sort()
      expect(actual).toEqual(
        [...Object.keys(publicRoutes[api]), ...privateRoutes[api]].sort()
      )
    })
    it.each(Object.entries(publicRoutes[api]))(
      `${api}: anonymous GET %s`,
      async (path, policy) => {
        const response = await request(api, path, {
          headers: { Origin: 'https://example.org' }
        })
        expect(response.status).toBe(200)
        expect(response.headers.get('Cache-Control')).toBe(policy)
        expect(response.headers.get('Vary')?.split(/,\s*/)).toEqual(
          expect.arrayContaining(['origin', 'cookie', 'authorization'])
        )
        expect(response.headers.get('Vary')).not.toContain('*')
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
          'https://example.org'
        )
      }
    )
    it.each(Object.keys(publicRoutes[api]))(
      `${api}: credentials bypass public caching for %s`,
      async (path) => {
        for (const headers of [
          new Headers({ Cookie: cookie }),
          new Headers({ Authorization: 'Bearer test' })
        ]) {
          const response = await request(api, path, { headers })
          if (headers.has('Cookie')) expect(response.status).toBe(200)
          expect(response.headers.get('Cache-Control')).toBe(privatePolicy)
        }
      }
    )
    it.each(
      privateRoutes[api].flatMap((path) =>
        path === '/login/:provider'
          ? ['/login/github', '/login/google']
          : [path]
      )
    )(`${api}: private GET %s`, async (path) => {
      const response = await request(api, path)
      expect(response.headers.get('Cache-Control')).toBe(privatePolicy)
    })
    it(`${api}: every mutation is uncached, including validation and auth failures`, async () => {
      for (const route of apps[api].routes.filter((r) =>
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)
      )) {
        const response = await request(api, route.path, {
          method: route.method,
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        })
        expect(
          response.headers.get('Cache-Control'),
          `${route.method} ${route.path}`
        ).toBe(privatePolicy)
      }
    })
    it(`${api}: errors cannot inherit public cache lifetimes`, async () => {
      for (const path of [
        '/maps/0000000000000000',
        '/maps?limit=invalid',
        '/missing-route',
        api === 'rest' ? '/projections/missing' : '/organizations/missing'
      ]) {
        const response = await request(api, path)
        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(response.headers.get('Cache-Control'), path).toBe(privatePolicy)
      }
    })
    it(`${api}: versioned map metadata remains refreshable`, async () => {
      const response = await request(
        api,
        `/maps/${replacements.mapId}@${checksum}`
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe(medium)
    })
    it(`${api}: mounted auth responses and cookies are uncached`, async () => {
      const response = await request(api, '/auth/sign-in/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
      expect(response.status).toBe(200)
      expect(response.headers.getSetCookie().length).toBeGreaterThan(0)
      expect(response.headers.get('Cache-Control')).toBe(privatePolicy)
      const session = await request(api, '/auth/get-session', {
        headers: { Cookie: cookie }
      })
      expect(session.status).toBe(200)
      expect((await session.json()).user.id).toBe(replacements.userId)
      expect(session.headers.get('Cache-Control')).toBe(privatePolicy)
    })
  }
  for (const api of ['rest', 'annotations'] as const) {
    it.each([
      ['/maps?limit=200', 30],
      ['/manifests/:manifestId', 300]
    ] as const)(
      `${api}: changed data becomes visible after %s expires`,
      async (path, ttl) => {
        let time = 100000
        const cache = createResponseCache(() => time)
        const handle = vi.fn((init?: RequestInit) => request(api, path, init))
        async function cachedRead(init?: RequestInit) {
          const pending: Promise<unknown>[] = []
          const response = await fetchWithPublicCache(
            new Request(`https://cache.example${resolve(path)}`, init),
            {
              cache,
              namespace: api,
              waitUntil(promise) {
                pending.push(promise)
              }
            },
            () => handle(init)
          )
          await Promise.all(pending)
          return response
        }
        const before = await context.client.query<{ label: unknown }>(
          'SELECT label FROM iiif.manifests WHERE id = $1',
          [replacements.manifestId]
        )
        const first = await cachedRead()
        expect(first.status).toBe(200)
        expect(first.headers.get('X-Allmaps-Cache')).toBe('MISS')
        const original = await first.text()
        const newLabel = `Updated ${api} ${ttl}-second cache fixture`
        try {
          await context.client.query(
            'UPDATE iiif.manifests SET label = $1 WHERE id = $2',
            [JSON.stringify({ en: [newLabel] }), replacements.manifestId]
          )
          time += (ttl - 1) * 1000
          const hit = await cachedRead()
          expect(hit.headers.get('X-Allmaps-Cache')).toBe('HIT')
          expect(await hit.text()).toBe(original)
          expect(handle).toHaveBeenCalledTimes(1)
          const privateRead = await cachedRead({ headers: { Cookie: cookie } })
          expect(privateRead.headers.get('X-Allmaps-Cache')).toBe('BYPASS')
          expect(privateRead.headers.get('Cache-Control')).toBe(privatePolicy)
          expect(await privateRead.text()).toContain(newLabel)
          time += 1000
          const refreshed = await cachedRead()
          expect(refreshed.headers.get('X-Allmaps-Cache')).toBe('MISS')
          expect(await refreshed.text()).toContain(newLabel)
          expect(handle).toHaveBeenCalledTimes(3)
        } finally {
          await context.client.query(
            'UPDATE iiif.manifests SET label = $1 WHERE id = $2',
            [JSON.stringify(before.rows[0].label), replacements.manifestId]
          )
        }
      }
    )

    it(`${api}: preserves signed-in access to elevated map limits`, async () => {
      // More than 200 real rows makes a silently lost session observable.
      await context.client.query(
        `
        INSERT INTO maps (id, image_id, checksum, image_checksum, version, latest, data, resource_mask, geo_mask)
        SELECT 'cace9000' || lpad(to_hex(n), 8, '0'), image_id, checksum, image_checksum,
          version, latest, data, resource_mask, geo_mask
        FROM maps CROSS JOIN generate_series(1, 205) AS n
        WHERE id = $1 AND latest`,
        [replacements.mapId]
      )
      try {
        const publicRead = await request(api, '/maps?limit=201')
        const signedInRead = await request(api, '/maps?limit=201', {
          headers: { Cookie: cookie }
        })
        expect(publicRead.status).toBe(200)
        expect(signedInRead.status).toBe(200)
        const publicData = await publicRead.json()
        const signedInData = await signedInRead.json()
        expect(
          api === 'rest' ? publicData.length : publicData.items.length
        ).toBe(200)
        expect(
          api === 'rest' ? signedInData.length : signedInData.items.length
        ).toBe(201)
        expect(signedInRead.headers.get('Cache-Control')).toBe(privatePolicy)
      } finally {
        await context.client.query("DELETE FROM maps WHERE id LIKE 'cace9000%'")
      }
    })
  }
  it('authenticated list writes and interactive deletion transactions remain uncached', async () => {
    const headers = { Cookie: cookie, 'Content-Type': 'application/json' }
    const created = await request('rest', '/lists', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Cache policy transaction' })
    })
    expect(created.status).toBe(200)
    expect(created.headers.get('Cache-Control')).toBe(privatePolicy)
    const list = await created.json()
    const read = await request('rest', `/lists/${list.id}`, { headers })
    expect(read.status).toBe(200)
    expect(read.headers.get('Cache-Control')).toBe(privatePolicy)
    const deleted = await request('rest', `/lists/${list.id}`, {
      method: 'DELETE',
      headers
    })
    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ success: true })
    expect(deleted.headers.get('Cache-Control')).toBe(privatePolicy)
    const missing = await request('rest', `/lists/${list.id}`, { headers })
    expect(missing.status).toBe(404)
    expect(missing.headers.get('Cache-Control')).toBe(privatePolicy)
  })
  it('versioned image annotations are not immutable', async () => {
    const response = await request(
      'annotations',
      `/images/${replacements.imageId}@${imageChecksum}`
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(medium)
  })
})
