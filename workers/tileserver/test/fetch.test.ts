import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCachedFetch } from '../src/lib/fetch.js'
import type { WorkerEnv } from '@allmaps/env/worker'

const env = {
  USE_CACHE: true,
  CLOUDFLARE_CACHE_HOURS: 48
} as WorkerEnv

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('upstream fetch', () => {
  it('caches only successful responses and preserves other request options', async () => {
    const response = new Response('image')
    const fetch = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetch)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const signal = new AbortController().signal
    const init = {
      signal,
      headers: { Accept: 'image/webp' },
      cf: {
        cacheTtl: 123,
        cacheTtlByStatus: { '400-599': 123 },
        cacheEverything: false,
        cacheKey: 'custom-key'
      }
    }
    expect(
      await createCachedFetch(env)('https://example.org/image', init)
    ).toBe(response)
    expect(fetch).toHaveBeenCalledWith('https://example.org/image', {
      signal,
      headers: new Headers({
        ...init.headers,
        'User-Agent': 'Allmaps Tile Server (+https://allmaps.xyz/)'
      }),
      cf: {
        cacheKey: 'custom-key',
        cacheEverything: true,
        cacheTtlByStatus: { '200-299': 172800, '300-599': -1 }
      }
    })
    expect(init.cf.cacheTtl).toBe(123)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'logs upstream diagnostics with caching enabled=%s',
    async (useCache) => {
      const response = new Response('rate limited', {
        status: 429,
        headers: { 'Retry-After': '60', Age: '120', 'CF-Cache-Status': 'HIT' }
      })
      const fetch = vi.fn().mockResolvedValue(response)
      vi.stubGlobal('fetch', fetch)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const init = { headers: { Accept: 'application/json' } }
      const result = await createCachedFetch({ ...env, USE_CACHE: useCache })(
        new URL('https://user:password@example.org/info.json?token=secret'),
        init
      )
      expect(result).toBe(response)
      expect(await result.text()).toBe('rate limited')
      expect(warn).toHaveBeenCalledWith('Upstream request failed', {
        url: 'https://example.org/info.json',
        status: 429,
        retryAfter: '60',
        age: '120',
        cfCacheStatus: 'HIT'
      })
      expect(fetch.mock.calls[0][1].headers.get('User-Agent')).toBe(
        'Allmaps Tile Server (+https://allmaps.xyz/)'
      )
      expect(fetch.mock.calls[0][1].headers.get('Accept')).toBe(
        'application/json'
      )
      expect(init.headers).toEqual({ Accept: 'application/json' })
    }
  )

  it('logs missing diagnostic headers as null and supports Request inputs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 }))
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await createCachedFetch(env)(new Request('https://example.org/info.json'))
    expect(warn).toHaveBeenCalledWith('Upstream request failed', {
      url: 'https://example.org/info.json',
      status: 503,
      retryAfter: null,
      age: null,
      cfCacheStatus: null
    })
  })

  it.each([false, true])(
    'preserves Request headers and adds a User-Agent with caching enabled=%s',
    async (useCache) => {
      const fetch = vi.fn().mockResolvedValue(new Response('image'))
      vi.stubGlobal('fetch', fetch)
      const request = new Request('https://example.org/info.json', {
        headers: { Accept: 'application/json' }
      })
      await createCachedFetch({ ...env, USE_CACHE: useCache })(request)
      const headers = fetch.mock.calls[0][1].headers
      expect(headers.get('Accept')).toBe('application/json')
      expect(headers.get('User-Agent')).toBe(
        'Allmaps Tile Server (+https://allmaps.xyz/)'
      )
      expect(request.headers.has('User-Agent')).toBe(false)
    }
  )
})
