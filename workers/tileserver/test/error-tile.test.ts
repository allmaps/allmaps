import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { URL as NodeURL } from 'node:url'
import init from '@allmaps/render-wasm'
import UPNG from 'upng-js'
import { createErrorTileResponse } from '../src/lib/error-tile.js'
import { TileError } from '../src/lib/tile-error.js'
import { mapsFromQuery } from '../src/lib/maps-from-request.js'

beforeAll(async () => {
  await init({
    module_or_path: await readFile(
      new NodeURL(
        '../../../packages/render-wasm/pkg/allmaps_render_wasm_bg.wasm',
        import.meta.url
      )
    )
  })
})

describe('error tiles', () => {
  it.each([401, 404, 429, 503])(
    'preserves upstream HTTP %s from map loading in diagnostic headers',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status }))
      )
      try {
        const env = { USE_CACHE: false } as Parameters<typeof mapsFromQuery>[0]
        const request = Object.assign(
          new Request('https://example.org/1/0/0.png'),
          {
            route: '/:z/:x/:y.png',
            params: { z: '1', x: '0', y: '0' },
            query: { url: 'https://example.org/annotation.json' }
          }
        )
        const error = await mapsFromQuery(env, request).catch(
          (error: unknown) => error
        )
        expect(error).toBeInstanceOf(TileError)
        if (!(error instanceof TileError))
          throw new Error('Expected a TileError')
        expect(error.status).toBe(status === 404 ? 404 : 502)
        const response = createErrorTileResponse(error, request)
        expect(response.headers.get('X-Allmaps-Error')).toBe('map-data')
        expect(response.headers.get('X-Allmaps-Upstream-Status')).toBe(
          String(status)
        )
        expect(response.headers.get('X-Allmaps-Error-Status')).toBe(
          String(error.status)
        )
      } finally {
        vi.unstubAllGlobals()
      }
    }
  )
  it.each([false, true])(
    'renders an opaque diagnostic PNG, retina=%s',
    async (retina) => {
      const error = new TileError('source-image', 502)
      error.upstreamStatus = 403
      const response = createErrorTileResponse(
        error,
        new Request(`https://example.org/1/0/0${retina ? '@2x' : ''}.png`)
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Allmaps-Error')).toBe('source-image')
      expect(response.headers.get('X-Allmaps-Upstream-Status')).toBe('403')
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      const image = UPNG.decode(await response.arrayBuffer())
      expect(image.width).toBe(retina ? 512 : 256)
      expect(image.height).toBe(image.width)
      const pixels = new Uint8Array(UPNG.toRGBA8(image)[0])
      expect(
        pixels
          .filter((_, index) => index % 4 === 3)
          .every((alpha) => alpha === 255)
      ).toBe(true)
      expect(
        pixels.some((value, index) => index % 4 === 0 && value === 135)
      ).toBe(true)
    }
  )

  it('encodes WebP requests as WebP', async () => {
    const response = createErrorTileResponse(
      new TileError('invalid-data', 422),
      new Request('https://example.org/1/0/0.webp')
    )
    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(response.headers.get('Content-Type')).toBe('image/webp')
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WEBP')
  })

  it('does not cache diagnostic tiles or HTTP errors', async () => {
    const put = vi.fn()
    vi.stubGlobal('caches', { default: { put } })
    try {
      const cache = await import('../src/lib/cache.js')
      const request = new Request('https://example.org/1/0/0.png')
      const response = createErrorTileResponse(
        new TileError('source-image', 502),
        request
      )
      const env = {
        BROWSER_CACHE_HOURS: 1,
        CLOUDFLARE_CACHE_HOURS: 1
      } as Parameters<typeof cache.headers>[2]
      await cache.headers(response, request, env)
      await cache.put(response, request)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(response.headers.get('CDN-Cache-Control')).toBe('no-store')
      expect(put).not.toHaveBeenCalled()
      const failed = new Response('error', { status: 502 })
      await cache.headers(failed, request, env)
      await cache.put(failed, request)
      expect(failed.headers.get('Cache-Control')).toBe('no-store')
      expect(put).not.toHaveBeenCalled()
      await cache.put(new Response('normal tile'), request)
      expect(put).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
