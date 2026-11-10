import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoRouter, StatusError } from 'itty-router'
import { WarpedMapErrorEvent, WarpedMapEventType } from '@allmaps/render'

import type { Env } from '../src/shared/types.js'

const renderer = vi.hoisted(() => ({
  render: vi.fn(),
  destroy: vi.fn(),
  addGeoreferenceAnnotation: vi.fn(),
  put: vi.fn(),
  instance: undefined as
    | (EventTarget & { tileCache: EventTarget; warpedMapList: EventTarget })
    | undefined
}))

vi.mock('@allmaps/render-wasm', () => ({}))
vi.mock('@allmaps/render/wasm', () => ({
  WasmRenderer: class extends EventTarget {
    tileCache = new EventTarget()
    warpedMapList = new EventTarget()
    render = renderer.render
    destroy = renderer.destroy
    addGeoreferenceAnnotation = renderer.addGeoreferenceAnnotation
    constructor() {
      super()
      renderer.instance = this
    }
  }
}))

import { generateWarpedMapImage } from '../src/shared/warped-map-wasm.js'

const env = {
  USE_CACHE: false,
  PUBLIC_ANNOTATIONS_BASE_URL: 'https://annotations.example.org',
  BROWSER_CACHE_HOURS: 720,
  CLOUDFLARE_CACHE_HOURS: 24
} as Env
const resource = { type: 'image', id: 'test-image' } as const
const size: [number, number] = [1200, 630]
const options = {
  bounds: [-85, 25, -80, 30] as [number, number, number, number],
  format: 'jpeg' as const
}

beforeEach(() => {
  vi.clearAllMocks()
  renderer.addGeoreferenceAnnotation.mockReturnValue([{ ok: true }])
  renderer.render.mockResolvedValue(new Uint8Array([1, 2, 3]))
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json({})))
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('failed preview renders', () => {
  it.each(['metadata', 'tile', 'renderer'] as const)(
    'rejects swallowed %s errors and never caches a blank or partial image',
    async (failure) => {
      vi.stubGlobal('caches', { default: { put: renderer.put } })
      const cache = await import('../src/shared/cache.js')
      renderer.render.mockImplementation(async () => {
        const instance = renderer.instance!
        const target =
          failure === 'metadata'
            ? instance.warpedMapList
            : failure === 'tile'
              ? instance.tileCache
              : instance
        const eventType =
          failure === 'metadata'
            ? WarpedMapEventType.IMAGEINFOFETCHERROR
            : failure === 'tile'
              ? WarpedMapEventType.TILEFETCHERROR
              : WarpedMapEventType.ERROR
        target.dispatchEvent(
          new WarpedMapErrorEvent(
            new Error('Forbidden'),
            { status: 403 },
            eventType
          )
        )
        // Renderers can return an encoded background or incomplete image after failure.
        return new Uint8Array([1, 2, 3])
      })
      const router = AutoRouter({ finally: [cache.headers, cache.put] })
      router.get('/preview.jpg', () =>
        generateWarpedMapImage(env, resource, size, options)
      )
      const response = await router.fetch(
        new Request('https://preview.example.org/preview.jpg'),
        env
      )
      expect(response.status).toBe(failure === 'renderer' ? 500 : 502)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(response.headers.get('CDN-Cache-Control')).toBe('no-store')
      expect(renderer.put).not.toHaveBeenCalled()
      expect(renderer.destroy).toHaveBeenCalledOnce()
    }
  )

  it('returns successful images and fetches the annotation only once', async () => {
    const response = await generateWarpedMapImage(env, resource, size, options)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    expect(fetch).toHaveBeenCalledOnce()
    expect(renderer.destroy).toHaveBeenCalledOnce()
  })

  it.each([
    { results: [] },
    { results: [{ ok: false, error: new Error('Invalid map') }] }
  ])('rejects missing or invalid maps', async ({ results }) => {
    renderer.addGeoreferenceAnnotation.mockReturnValue(results)
    await expect(
      generateWarpedMapImage(env, resource, size, options)
    ).rejects.toMatchObject({ status: 422 })
    expect(renderer.render).not.toHaveBeenCalled()
    expect(renderer.destroy).toHaveBeenCalledOnce()
  })

  it('preserves annotation 404s', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 404 })))
    )
    await expect(
      generateWarpedMapImage(env, resource, size, options)
    ).rejects.toBeInstanceOf(StatusError)
    expect(renderer.render).not.toHaveBeenCalled()
  })
})
