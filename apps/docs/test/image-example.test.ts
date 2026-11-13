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
    const calls: string[] = []
    class Canvas {
      width: number
      height: number
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
        assert.equal(width, chosen.width)
        assert.equal(height, chosen.height)
      }
      async convertToBlob({ type }: { type: string }) {
        assert.equal(type, `image/${format}`)
        calls.push('encode')
        return new Blob(['image'], { type })
      }
    }
    const context = {
      globalCompositeOperation: 'source-over',
      fillStyle: '',
      fillRect: (...rectangle: number[]) => {
        assert.equal(context.globalCompositeOperation, 'destination-over')
        assert.equal(context.fillStyle, '#fff')
        assert.deepEqual(rectangle, [0, 0, chosen.width, chosen.height])
        calls.push('background')
      }
    }
    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor
    await new AsyncFunction(
      'CanvasRenderer',
      'OffscreenCanvas',
      'fetch',
      'self',
      source
    )(
      function (canvas: Canvas) {
        assert.ok(canvas instanceof Canvas)
        return {
          context,
          addGeoreferenceAnnotation: () => [{ ok: true }],
          render: async () => calls.push('render'),
          destroy: () => calls.push('destroy')
        }
      },
      Canvas,
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
    assert.deepEqual(calls, [
      'render',
      ...(format === 'jpeg' ? ['background'] : []),
      'encode',
      'image',
      'destroy'
    ])
  }
})

test('copied rendering code releases the renderer when rendering fails', async () => {
  const source = imageExampleSource(settings).replace(/^import .*\n/gm, '')
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  let destroyed = false
  await assert.rejects(
    new AsyncFunction(
      'CanvasRenderer',
      'OffscreenCanvas',
      'fetch',
      'self',
      source
    )(
      function () {
        return {
          addGeoreferenceAnnotation: () => [{ ok: true }],
          render: async () => {
            throw new Error('Rendering failed')
          },
          destroy: () => {
            destroyed = true
          }
        }
      },
      class {},
      async () => ({ ok: true, json: async () => ({}) }),
      {
        postMessage: () =>
          assert.fail('Failed renders must not export an image')
      }
    ),
    /Rendering failed/
  )
  assert.equal(destroyed, true)
})
