import { describe, expect, it, vi } from 'vitest'
import { fetchWithPublicCache } from '../../../packages/api-shared/src/response-cache.ts'
import { createResponseCache } from './helpers/response-cache.ts'

function harness() {
  let time = 100000
  const cache = createResponseCache(() => time)
  const writes: Promise<unknown>[] = []
  const handle = vi.fn(async () =>
    Response.json(
      { version: handle.mock.calls.length },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=30',
          Vary: 'Origin, Cookie, Authorization'
        }
      }
    )
  )
  const options = {
    cache,
    namespace: 'rest-v1',
    waitUntil(promise: Promise<unknown>) {
      writes.push(promise)
    }
  }
  return {
    options,
    handle,
    entries: cache.entries,
    advance(seconds: number) {
      time += seconds * 1000
    },
    async read(path = '/maps?limit=10', init?: RequestInit) {
      const response = await fetchWithPublicCache(
        new Request(`https://api.example${path}`, init),
        options,
        handle
      )
      await Promise.all(writes)
      return response
    }
  }
}

describe('public Worker response cache', () => {
  it('serves identical responses without invoking the database handler on hits', async () => {
    const h = harness()
    const first = await h.read()
    expect(first.headers.get('X-Allmaps-Cache')).toBe('MISS')
    h.advance(5)
    const second = await h.read()
    expect(second.headers.get('X-Allmaps-Cache')).toBe('HIT')
    expect(second.headers.get('Age')).toBe('5')
    expect(second.headers.get('Cache-Control')).toBe(
      first.headers.get('Cache-Control')
    )
    const storedHeaders = [...h.entries.values()][0].headers
    expect(second.headers.get('Date')).toBe(storedHeaders.get('Date'))
    expect(storedHeaders.has('X-Allmaps-Cache-Stored-At')).toBe(false)
    expect(storedHeaders.has('X-Allmaps-Cache-Policy')).toBe(false)
    expect(await second.text()).toBe(await first.text())
    expect(h.handle).toHaveBeenCalledTimes(1)
  })

  it('expires at the TTL boundary and does not extend freshness on a hit', async () => {
    const h = harness()
    await h.read()
    h.advance(29)
    expect((await h.read()).headers.get('X-Allmaps-Cache')).toBe('HIT')
    h.advance(1)
    expect((await h.read()).headers.get('X-Allmaps-Cache')).toBe('MISS')
    expect(h.handle).toHaveBeenCalledTimes(2)
  })

  it('separates spatial filters, limits, versions, formats, origins, hosts and API namespaces', async () => {
    const h = harness()
    for (const path of [
      '/maps?limit=10',
      '/maps?limit=20',
      '/maps?intersects=1,2',
      '/maps?intersects=2,1',
      '/maps/a',
      '/maps/a@b',
      '/maps/a.geojson'
    ]) {
      expect((await h.read(path)).headers.get('X-Allmaps-Cache')).toBe('MISS')
    }
    await h.read('/maps?limit=10', {
      headers: { Origin: 'https://viewer.example' }
    })
    await h.read('/maps?limit=10', {
      headers: { Origin: 'https://here.example' }
    })
    await h.read('/maps?limit=10', {
      headers: { Accept: 'application/geo+json' }
    })
    for (const [url, namespace] of [
      ['https://other.example/maps?limit=10', 'rest-v1'],
      ['https://api.example/maps?limit=10', 'annotations-v1']
    ]) {
      expect(
        (
          await fetchWithPublicCache(
            new Request(url),
            { ...h.options, namespace },
            h.handle
          )
        ).headers.get('X-Allmaps-Cache')
      ).toBe('MISS')
    }
    expect(h.handle).toHaveBeenCalledTimes(12)
  })

  it('separates every supported representation header on cache hits', async () => {
    const h = harness()
    h.handle.mockImplementation(
      async () =>
        new Response(String(h.handle.mock.calls.length), {
          headers: {
            'Cache-Control': 'public, s-maxage=30',
            Vary: 'Origin, Accept, Accept-Encoding'
          }
        })
    )
    const representations: Record<string, string>[] = [
      {},
      { Origin: 'https://viewer.example' },
      { Accept: 'application/geo+json' },
      { 'Accept-Encoding': 'gzip' },
      { 'Accept-Encoding': 'br' },
      { 'Accept-Encoding': 'identity' }
    ]
    for (const [index, headers] of representations.entries()) {
      const response = await h.read(undefined, { headers })
      expect(response.headers.get('X-Allmaps-Cache')).toBe('MISS')
      expect(await response.text()).toBe(String(index + 1))
    }
    for (const [index, headers] of representations.entries()) {
      const response = await h.read(undefined, { headers })
      expect(response.headers.get('X-Allmaps-Cache')).toBe('HIT')
      expect(await response.text()).toBe(String(index + 1))
    }
    expect(h.handle).toHaveBeenCalledTimes(representations.length)
  })

  it.each<Record<string, string>>([
    { Cookie: 'session=secret' },
    { Cookie: '' },
    { Authorization: 'Bearer secret' },
    { Range: 'bytes=0-20' },
    { 'If-None-Match': 'abc' },
    { 'Cache-Control': 'no-cache' },
    { 'Cache-Control': 'no-store' },
    { 'Cache-Control': 'max-age=0' },
    { 'Cache-Control': 'max-age="0"' },
    { Pragma: 'no-cache' }
  ])('bypasses a populated cache for request headers %j', async (headers) => {
    const h = harness()
    await h.read()
    expect(
      (await h.read(undefined, { headers })).headers.get('X-Allmaps-Cache')
    ).toBe('BYPASS')
    expect(h.handle).toHaveBeenCalledTimes(2)
    expect(h.entries.size).toBe(1)
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])(
    'never caches %s',
    async (method) => {
      const h = harness()
      expect(
        (await h.read(undefined, { method })).headers.get('X-Allmaps-Cache')
      ).toBe('BYPASS')
      expect(h.entries.size).toBe(0)
    }
  )

  it.each([
    '/auth/get-session',
    '/login/github',
    '/login/google',
    '/logout',
    '/maps/random',
    '/organizations/a/users',
    '/lists/a',
    '/@user/lists/a',
    '/openapi.json'
  ])(
    'excludes %s even if a handler accidentally returns public headers',
    async (path) => {
      const h = harness()
      expect((await h.read(path)).headers.get('X-Allmaps-Cache')).toBe('BYPASS')
      expect(h.entries.size).toBe(0)
    }
  )

  it.each<{ status: number; headers: Record<string, string> }>([
    { status: 302, headers: {} },
    { status: 401, headers: {} },
    { status: 404, headers: {} },
    { status: 500, headers: {} },
    { status: 206, headers: {} },
    { status: 200, headers: { 'Set-Cookie': 'session=secret' } },
    { status: 200, headers: { Vary: '*' } },
    { status: 200, headers: { Vary: 'X-Unknown' } },
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=30, private="foo"' }
    },
    { status: 200, headers: { 'Cache-Control': 'public, s-maxage=0' } }
  ])('does not store unsuitable response %j', async ({ status, headers }) => {
    const h = harness()
    h.handle.mockImplementation(
      async () =>
        new Response('data', {
          status,
          headers: { 'Cache-Control': 'public, s-maxage=30', ...headers }
        })
    )
    expect((await h.read()).headers.get('X-Allmaps-Cache')).toBe('BYPASS')
    expect(h.entries.size).toBe(0)
  })

  it('preserves the route policy and lets the cache expire it without refreshing hits', async () => {
    const h = harness()
    const policy = 'public, max-age=60, s-maxage=300'
    h.handle.mockImplementation(
      async () =>
        new Response('data', {
          headers: { 'Cache-Control': policy, 'Server-Timing': 'db;dur=25' }
        })
    )
    await h.read()
    expect([...h.entries.values()][0].headers.get('Cache-Control')).toBe(policy)
    h.advance(299)
    expect((await h.read()).headers.get('Server-Timing')).toBeNull()
    expect((await h.read()).headers.get('Cache-Control')).toBe(policy)
    h.advance(1)
    expect((await h.read()).headers.get('X-Allmaps-Cache')).toBe('MISS')
  })

  it('fails open when cache lookup or storage fails', async () => {
    const h = harness()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    h.options.cache.match = async () => {
      throw new Error('unavailable')
    }
    h.options.cache.put = async () => {
      throw new Error('unavailable')
    }
    const response = await h.read()
    expect(response.status).toBe(200)
    expect(h.handle).toHaveBeenCalledTimes(1)
    warning.mockRestore()
  })
})
