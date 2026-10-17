import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { Image } from '@allmaps/iiif-parser'
import { embeddedSvgSources } from '../src/lib/export-svg-images.ts'
import { MapExportError, imageInfoError } from '../src/lib/export-errors.ts'
import type { ExportableMapLayer } from '../src/lib/export-layer.ts'

function harness(t: TestContext, complete: boolean) {
  const fetched: string[] = []
  const drawn: unknown[][] = []
  const canvases: { width: number; height: number }[] = []
  let encodings = 0
  let closed = false
  const globals = [
    'document',
    'FileReader',
    'createImageBitmap',
    'fetch'
  ] as const
  const descriptors = globals.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name)
  )
  t.after(() => {
    globals.forEach((name, i) => {
      const descriptor = descriptors[i]
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    })
  })
  Object.assign(globalThis, {
    document: {
      createElement() {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            putImageData() {},
            drawImage: (...args: unknown[]) => drawn.push(args)
          }),
          toBlob(callback: BlobCallback) {
            encodings++
            callback(new Blob(['cached pixels'], { type: 'image/png' }))
          }
        }
        canvases.push(canvas)
        return canvas
      }
    },
    FileReader: class {
      result?: string
      onload?: () => void
      onloadend?: () => void
      async readAsDataURL(blob: Blob) {
        this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`
        this.onload?.()
        this.onloadend?.()
      }
      abort() {
        this.onloadend?.()
      }
    },
    createImageBitmap: async () => ({
      width: 500,
      height: 400,
      close() {
        closed = true
      }
    }),
    fetch: async (url: string) => {
      assert.equal(
        complete,
        false,
        'Complete caches must not fetch image pixels'
      )
      fetched.push(url)
      return new Response(
        new Blob(['downloaded pixels'], { type: 'image/jpeg' })
      )
    }
  })
  const image = Image.parse({
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': 'https://example.org/image',
    protocol: 'http://iiif.io/api/image',
    width: 1000,
    height: 800,
    profile: ['http://iiif.io/api/image/2/level2.json']
  })
  const tile = {
    data: { width: 500, height: 400 },
    fetchableTile: {
      options: {
        imageRequest: {
          region: { x: 0, y: 0, width: complete ? 1000 : 500, height: 800 },
          size: { width: 500, height: 400 }
        }
      }
    }
  }
  const layer = {
    renderer: { tileCache: { getMapCachedTiles: () => [tile] } }
  } as unknown as ExportableMapLayer
  const images = new Map([
    ['first', image],
    ['copy', image]
  ])
  return {
    images,
    layer,
    run: (signal = new AbortController().signal, cache?: Map<string, string>) =>
      embeddedSvgSources(
        layer,
        images,
        { width: 500, height: 500 },
        signal,
        cache
      ),
    fetched,
    drawn,
    canvases,
    encodings: () => encodings,
    closed: () => closed
  }
}

test('SVG embedding reuses complete cached pixels once for duplicated maps without network requests', async (t) => {
  const h = harness(t, true)
  const sources = await h.run()
  assert.equal(sources.get('first'), sources.get('copy'))
  assert.match(sources.get('first')!, /^data:image\/png;base64,/)
  assert.equal(h.fetched.length, 0)
  assert.equal(h.encodings(), 1)
  assert.equal(h.drawn.length, 1)
  assert.deepEqual(h.drawn[0].slice(1), [0, 0, 500, 400, 0, 0, 500, 400])
  assert.ok(h.canvases.every((c) => c.width === 0 && c.height === 0))
})

test('incomplete caches fetch one bounded rendition and preserve its JPEG encoding', async (t) => {
  const h = harness(t, false)
  const sources = await h.run()
  assert.equal(sources.get('first'), sources.get('copy'))
  assert.match(sources.get('first')!, /^data:image\/jpeg;base64,/)
  assert.equal(h.fetched.length, 1)
  assert.match(h.fetched[0], /\/full\/500,\/0\/default.jpg$/)
  assert.equal(h.encodings(), 0)
  assert.equal(h.closed(), true)
})

test('cancelled SVG embedding does not fetch or allocate images', async (t) => {
  const h = harness(t, false)
  await assert.rejects(
    h.run(AbortSignal.abort(new Error('Cancelled'))),
    /Cancelled/
  )
  assert.equal(h.fetched.length, 0)
  assert.equal(h.canvases.length, 0)
})

test('embedding errors identify every affected copy and distinguish HTTP, network, invalid and oversized images', async (t) => {
  const cases = [
    {
      name: 'unavailable',
      message: /unavailable.*HTTP 503/,
      fetch: async () => new Response('', { status: 503 })
    },
    {
      name: 'missing',
      message: /not available.*HTTP 404/,
      fetch: async () => new Response('', { status: 404 })
    },
    {
      name: 'denied',
      message: /denied.*HTTP 403/,
      fetch: async () => new Response('', { status: 403 })
    },
    {
      name: 'rate limited',
      message: /rate limiting.*HTTP 429/,
      fetch: async () => new Response('', { status: 429 })
    },
    {
      name: 'request too large',
      message: /too large.*resolution.*HTTP 413/,
      fetch: async () => new Response('', { status: 413 })
    },
    {
      name: 'network',
      message: /could not be reached.*CORS/,
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    },
    {
      name: 'invalid image',
      message: /unreadable image/,
      bitmap: async () => {
        throw new Error('Invalid image')
      }
    },
    {
      name: 'oversized image',
      message: /larger than the requested dimensions/,
      bitmap: async () => ({ width: 9000, height: 8000, close() {} })
    }
  ]
  for (const entry of cases)
    await t.test(entry.name, async (t) => {
      const h = harness(t, false)
      if (entry.fetch) Object.assign(globalThis, { fetch: entry.fetch })
      if (entry.bitmap)
        Object.assign(globalThis, { createImageBitmap: entry.bitmap })
      await assert.rejects(h.run(), (error: unknown) => {
        assert.ok(error instanceof MapExportError)
        assert.deepEqual(error.mapIds, ['first', 'copy'])
        assert.match(error.message, entry.message)
        assert.doesNotMatch(error.message, /lower.*DPI/i)
        return true
      })
    })
})

test('retrying after an omission reuses successful images without refetching and never caches failures', async (t) => {
  const h = harness(t, false)
  const broken = Image.parse({
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': 'https://example.org/broken',
    protocol: 'http://iiif.io/api/image',
    width: 1000,
    height: 800,
    profile: ['http://iiif.io/api/image/2/level2.json']
  })
  h.images.set('broken', broken)
  const fetchImage = globalThis.fetch
  Object.assign(globalThis, {
    fetch: (url: string, options: RequestInit) =>
      url.includes('/broken/')
        ? Promise.resolve(new Response('', { status: 404 }))
        : fetchImage(url, options)
  })
  const cache = new Map<string, string>()
  await assert.rejects(h.run(undefined, cache), (error: unknown) => {
    assert.ok(error instanceof MapExportError)
    assert.deepEqual(error.mapIds, ['broken'])
    return true
  })
  assert.equal(cache.size, 1)
  h.images.delete('broken')
  const sources = await h.run(undefined, cache)
  assert.equal(sources.size, 2)
  assert.equal(h.fetched.length, 1)
})

test('cancelling an image request is not turned into a skippable image failure', async (t) => {
  const h = harness(t, false)
  const controller = new AbortController()
  Object.assign(globalThis, {
    fetch: async () => {
      controller.abort(new DOMException('Cancelled', 'AbortError'))
      throw controller.signal.reason
    }
  })
  await assert.rejects(h.run(controller.signal), { name: 'AbortError' })
})

test('metadata errors preserve HTTP and network causes without a DPI suggestion', () => {
  assert.match(
    imageInfoError({ status: 403 }).message,
    /info.json.*denied.*HTTP 403/
  )
  assert.match(
    imageInfoError({ kind: 'network-or-cors' }).message,
    /info.json.*CORS/
  )
  assert.match(
    imageInfoError(new DOMException('Timeout', 'TimeoutError')).message,
    /too long.*info.json/
  )
})

test('an individual image timeout identifies the source and can be omitted', async (t) => {
  const h = harness(t, false)
  t.mock.method(AbortSignal, 'timeout', () =>
    AbortSignal.abort(new DOMException('Timeout', 'TimeoutError'))
  )
  Object.assign(globalThis, {
    fetch: async (_url: string, options: RequestInit) => {
      throw options.signal!.reason
    }
  })
  await assert.rejects(h.run(), (error: unknown) => {
    assert.ok(error instanceof MapExportError)
    assert.deepEqual(error.mapIds, ['first', 'copy'])
    assert.match(error.message, /took too long/)
    assert.equal(error.retryable, true)
    return true
  })
})

test('assembling cached tiles aligns fractional destination edges without transparent seams', async (t) => {
  const h = harness(t, true)
  const tiles = [
    [0, 333],
    [333, 334],
    [667, 333]
  ].map(([x, width]) => ({
    data: { width, height: 800 },
    fetchableTile: {
      options: {
        imageRequest: {
          region: { x, y: 0, width, height: 800 },
          size: { width, height: 800 }
        }
      }
    }
  }))
  h.layer.renderer!.tileCache.getMapCachedTiles = () => tiles as never
  await h.run()
  assert.deepEqual(
    h.drawn.map((draw) => draw.slice(5)),
    [
      [0, 0, 167, 400],
      [167, 0, 167, 400],
      [334, 0, 166, 400]
    ]
  )
})
