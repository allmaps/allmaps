import assert from 'node:assert/strict'
import { test } from 'node:test'
import { imageExampleSource, validateImageSettings } from '../src/lib/image.ts'

const settings = {
  annotationUrl: 'https://annotations.allmaps.org/maps/example',
  width: 1024,
  height: 1024,
  format: 'png' as const
}

test('image dimensions are bounded before starting rendering', () => {
  for (const dimension of [0, -1, 63, 2049, 1.5, NaN, Infinity, undefined]) {
    assert.throws(
      () => validateImageSettings({ ...settings, width: dimension as number }),
      /between 64 and 2,048/
    )
    assert.throws(
      () => validateImageSettings({ ...settings, height: dimension as number }),
      /between 64 and 2,048/
    )
  }
  assert.equal(
    validateImageSettings({ ...settings, width: 64, height: 2048 }).height,
    2048
  )
  assert.throws(() =>
    validateImageSettings({ ...settings, annotationUrl: 'javascript:alert(1)' })
  )
})

test('copied rendering code preserves URL contents, output format and dimensions', async () => {
  for (const format of ['png', 'webp', 'jpeg'] as const) {
    const chosen = {
      ...settings,
      annotationUrl: 'https://example.org/map?label="test"&value=\\text',
      width: 800,
      height: 600,
      format
    }
    const source = imageExampleSource(chosen).replace(/^import .*\n/gm, '')
    const calls: unknown[] = []
    const renderer = {
      warpedMapList: {},
      addGeoreferenceAnnotation: () => [{ ok: true }],
      render: async () => new Uint8Array([1, 2, 3]),
      destroy: () => calls.push('destroy')
    }
    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor
    await new AsyncFunction(
      'Viewport',
      'WasmRenderer',
      'initializeWasm',
      'wasmModule',
      'fetch',
      'self',
      source
    )(
      {
        fromSizeAndMaps: (size: number[]) => {
          assert.deepEqual(size, [800, 600])
          return {}
        }
      },
      function (
        _module: unknown,
        options: { outputFormat: string; backgroundColor?: number[] }
      ) {
        assert.equal(options.outputFormat, format)
        assert.deepEqual(
          options.backgroundColor,
          format === 'jpeg' ? [255, 255, 255] : undefined
        )
        return renderer
      },
      async () => {},
      {},
      async (url: string) => {
        assert.equal(url, chosen.annotationUrl)
        return { ok: true, json: async () => ({}) }
      },
      {
        postMessage: ({ blob }: { blob: Blob }) => {
          assert.equal(blob.type, `image/${format}`)
          calls.push('image')
        }
      }
    )
    assert.deepEqual(calls, ['image', 'destroy'])
  }
})

test('WASM rendering produces actual PNG, JPEG, and lossless WebP image bytes', async () => {
  const { readFile } = await import('node:fs/promises')
  const { Viewport } = await import('@allmaps/render')
  const { WasmRenderer } = await import('@allmaps/render/wasm')
  const wasm = await import('@allmaps/render-wasm')
  const { generateAnnotation } = await import('@allmaps/annotation')
  await wasm.default({
    module_or_path: await readFile(
      new URL(import.meta.resolve('@allmaps/render-wasm/wasm'), import.meta.url)
    )
  })
  const pixels = new Uint8Array(64 * 64 * 4)
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 255
    pixels[index + 3] = 255
  }
  const imageBytes = wasm.encode_rgba_to_png(pixels, 64, 64)
  const resourceId = 'https://example.org/iiif/image'
  const annotation = generateAnnotation({
    type: 'GeoreferencedMap',
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    resource: { id: resourceId, type: 'ImageService2', width: 64, height: 64 },
    resourceMask: [
      [0, 0],
      [64, 0],
      [64, 64],
      [0, 64]
    ],
    gcps: [
      { resource: [0, 0], geo: [0, 0] },
      { resource: [64, 0], geo: [0.01, 0] },
      { resource: [0, 64], geo: [0, -0.01] }
    ]
  })
  for (const format of ['png', 'webp', 'jpeg'] as const) {
    let tileRequests = 0
    const renderer = new WasmRenderer(wasm, {
      outputFormat: format,
      backgroundColor: format === 'jpeg' ? [255, 255, 255] : undefined,
      fetchFn: async (url) => {
        if (String(url).endsWith('/info.json'))
          return Response.json({
            '@context': 'http://iiif.io/api/image/2/context.json',
            '@id': resourceId,
            protocol: 'http://iiif.io/api/image',
            profile: ['http://iiif.io/api/image/2/level2.json'],
            width: 64,
            height: 64,
            tiles: [{ width: 64, scaleFactors: [1] }]
          })
        tileRequests++
        return new Response(new Uint8Array(imageBytes), {
          headers: { 'content-type': 'image/png' }
        })
      }
    })
    try {
      renderer.addGeoreferenceAnnotation(annotation)
      const bytes = await renderer.render(
        Viewport.fromSizeAndGeoPolygon(
          [64, 64],
          [
            [
              [0, 0],
              [0.01, 0],
              [0.01, -0.01],
              [0, -0.01]
            ]
          ]
        )
      )
      assert.ok(tileRequests > 0)
      if (format === 'png')
        assert.deepEqual(
          [...bytes.slice(0, 8)],
          [137, 80, 78, 71, 13, 10, 26, 10]
        )
      else if (format === 'jpeg') {
        assert.deepEqual([...bytes.slice(0, 3)], [255, 216, 255])
        assert.deepEqual([...bytes.slice(-2)], [255, 217])
      } else {
        assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF')
        assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WEBP')
        assert.equal(new TextDecoder().decode(bytes.slice(12, 16)), 'VP8L')
      }
      const decoded = wasm.decode_jpeg_test(bytes)
      assert.equal(decoded.width, 64)
      assert.equal(decoded.height, 64)
      decoded.free()
    } finally {
      renderer.destroy()
    }
  }
})
