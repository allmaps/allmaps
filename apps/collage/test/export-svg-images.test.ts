import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { Image } from '@allmaps/iiif-parser'
import { embeddedSvgSources } from '../src/lib/export-svg-images.ts'
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
    run: (signal = new AbortController().signal) =>
      embeddedSvgSources(layer, images, { width: 500, height: 500 }, signal),
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
