import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCachedFetch } from '../src/shared/fetch.js'

import type { Env } from '../src/shared/types.js'

const env = { USE_CACHE: true, CLOUDFLARE_CACHE_HOURS: 24 } as Env
const userAgent = 'Allmaps Preview (+https://preview.allmaps.org/)'

afterEach(() => vi.unstubAllGlobals())

describe('preview upstream requests', () => {
  it.each([false, true])(
    'identifies requests and preserves headers and signals with caching enabled=%s',
    async (useCache) => {
      const fetch = vi.fn().mockResolvedValue(new Response('image'))
      vi.stubGlobal('fetch', fetch)
      const request = new Request('https://example.org/info.json', {
        headers: { Accept: 'application/json' }
      })
      const signal = new AbortController().signal
      await createCachedFetch({ ...env, USE_CACHE: useCache })(request, {
        signal
      })
      const [input, init] = fetch.mock.calls[0]
      expect(input).toBe(request)
      expect(init.signal).toBe(signal)
      expect(init.headers.get('Accept')).toBe('application/json')
      expect(init.headers.get('User-Agent')).toBe(userAgent)
      expect(request.headers.has('User-Agent')).toBe(false)
      if (!useCache) expect(init.cf).toBeUndefined()
    }
  )

  it('does not let caller TTLs cache failed responses or mutate caller headers', async () => {
    const failedResponse = new Response('Forbidden', { status: 403 })
    const fetch = vi.fn().mockResolvedValue(failedResponse)
    vi.stubGlobal('fetch', fetch)
    const init = {
      headers: [['Accept', 'image/jpeg']] as [string, string][],
      cf: {
        cacheTtl: 86400,
        cacheTtlByStatus: { '400-599': 86400 },
        cacheKey: 'custom'
      }
    }
    expect(
      await createCachedFetch(env)('https://example.org/tile.jpg', init)
    ).toBe(failedResponse)
    const options = fetch.mock.calls[0][1]
    expect(options.cf).toEqual({
      cacheEverything: true,
      cacheKey: 'custom',
      cacheTtlByStatus: { '200-299': 86400, '300-599': -1 }
    })
    expect(options.headers.get('Accept')).toBe('image/jpeg')
    expect(options.headers.get('User-Agent')).toBe(userAgent)
    expect(init.headers).toEqual([['Accept', 'image/jpeg']])
    expect(init.cf.cacheTtl).toBe(86400)
  })
})
