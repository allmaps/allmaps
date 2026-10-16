import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, test } from 'node:test'
import type { TestContext } from 'node:test'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ExportableMapLayer } from '../src/lib/export-layer.ts'
import {
  exportImage,
  loadExportImages,
  printViewport
} from '../src/lib/export-image.ts'
import type { ExportView } from '../src/lib/export-view.ts'

// changedpi uses FileReader; keep the real library in the Node export tests.
const fileReaderDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'FileReader'
)
beforeEach(() => {
  Object.assign(globalThis, {
    FileReader: class {
      result?: ArrayBuffer
      onload?: () => void
      async readAsArrayBuffer(blob: Blob) {
        this.result = await blob.arrayBuffer()
        this.onload?.()
      }
    }
  })
})
afterEach(() => {
  if (fileReaderDescriptor)
    Object.defineProperty(globalThis, 'FileReader', fileReaderDescriptor)
  else Reflect.deleteProperty(globalThis, 'FileReader')
})

const jpeg = new Blob(
  [readFileSync(new URL('./fixtures/export-pixel.jpg', import.meta.url))],
  { type: 'image/jpeg' }
)

const view: ExportView = {
  width: 1000,
  height: 600,
  center: [100, 200],
  metersPerPixel: 2,
  bearing: 0
}

function harness(
  t: TestContext,
  {
    empty = false,
    failed = false,
    cancel = false,
    selected = false,
    loadFailure = false,
    encoded = jpeg,
    dpi = 254
  } = {}
) {
  const controller = new AbortController()
  let pixelRatio = 2
  let prepared = false
  let finished = true // The old view starts idle: it must not be exported early.
  let cached = false
  let captures = 0
  let capturedSize: number[] = []
  const fills: string[] = []
  const created: { width: number; height: number; removed: boolean }[] = []
  const makeMap = (mapId: string, visible: boolean) => ({
    mapId,
    visible,
    shouldRenderMap() {
      return this.visible
    },
    hasImage() {
      assert.equal(
        mapId,
        'selected',
        'Unselected image services must not be loaded'
      )
      return !loadFailure
    },
    async loadImage() {
      throw new Error('Info failed')
    },
    fetchableTilesForViewport: [{ tileUrl: 'tile' }]
  })
  const maps = empty ? [] : [makeMap('selected', true)]
  if (selected) maps.push(makeMap('unselected', true), makeMap('hidden', false))
  const originalVisibility = maps.map(({ visible }) => visible)
  const capturedMaps: string[][] = []
  const coveredMaps: string[][] = []
  const canvas = {
    width: 2000,
    height: 1200,
    style: { visibility: 'visible' },
    parentElement: { append() {} }
  }
  const documentBefore = globalThis.document
  globalThis.document = {
    createElement() {
      const node = {
        width: 0,
        height: 0,
        removed: false,
        setAttribute() {},
        remove() {
          node.removed = true
        },
        getContext() {
          return {
            drawImage() {
              const visibleIds = maps
                .filter((map) => map.visible)
                .map((map) => map.mapId)
              if (created.indexOf(node) === 1) {
                assert.ok(empty || (prepared && finished && cached))
                captures++
                capturedSize = [canvas.width, canvas.height]
                capturedMaps.push(visibleIds)
              } else {
                coveredMaps.push(visibleIds)
              }
            },
            fillRect() {
              fills.push(this.fillStyle)
            },
            fillStyle: ''
          }
        },
        toBlob(callback: BlobCallback) {
          callback(encoded)
        }
      }
      created.push(node)
      return node
    }
  } as unknown as Document
  t.after(() => {
    globalThis.document = documentBefore
  })
  const tileCache = Object.assign(new EventTarget(), {
    getCacheableTile() {
      return { isCachedTile: () => cached }
    }
  })
  Object.defineProperty(tileCache, 'finished', { get: () => finished })
  const gl = {
    MAX_VIEWPORT_DIMS: 1,
    MAX_RENDERBUFFER_SIZE: 2,
    MAX_TEXTURE_SIZE: 3,
    getParameter: (key: number) => (key === 1 ? [8192, 8192] : 8192),
    get drawingBufferWidth() {
      return canvas.width
    },
    get drawingBufferHeight() {
      return canvas.height
    }
  }
  const layer = {
    exportViewport: undefined as ReturnType<typeof printViewport> | undefined,
    getWarpedMap: (id: string) => maps.find((map) => map.mapId === id),
    setMapOptions(id: string, options: { visible: boolean }) {
      assert.equal(
        canvas.style.visibility,
        'hidden',
        'Visibility changes happen behind the frozen cover'
      )
      maps.find((map) => map.mapId === id)!.visible = options.visible
    },
    renderer: {
      gl,
      tileCache,
      previousSignificantViewport: undefined as
        ReturnType<typeof printViewport> | undefined,
      warpedMapList: {
        imagesById: new Map(),
        getMapIds: () => maps.map((map) => map.mapId),
        getWarpedMaps: () => maps.filter((map) => map.visible)
      }
    }
  }
  const events = new EventTarget()
  const map = {
    stop() {},
    getCanvas: () => canvas,
    getPixelRatio: () => pixelRatio,
    setPixelRatio(ratio: number) {
      pixelRatio = ratio
      canvas.width = Math.round(view.width * ratio)
      canvas.height = Math.round(view.height * ratio)
    },
    on: (name: string, listener: EventListener) =>
      events.addEventListener(name, listener),
    off: (name: string, listener: EventListener) =>
      events.removeEventListener(name, listener),
    triggerRepaint() {
      setTimeout(() => {
        if (layer.exportViewport && !prepared) {
          prepared = true
          finished = false
          layer.renderer.previousSignificantViewport = layer.exportViewport
          if (cancel)
            controller.abort(new DOMException('Cancelled', 'AbortError'))
          setTimeout(() => {
            cached = !failed
            finished = true
            tileCache.dispatchEvent(new Event('allrequestedtilesloaded'))
          }, 5)
        }
        events.dispatchEvent(new Event('render'))
      }, 0)
    }
  }
  return {
    run: (
      frame = view,
      backgroundColor?: string,
      format: 'jpg' | 'png' = 'jpg'
    ) =>
      exportImage(
        map as unknown as MapLibreMap,
        layer as unknown as ExportableMapLayer,
        frame,
        {
          format,
          dpi,
          scale: 20000,
          backgroundColor,
          mapIds: selected ? new Set(['selected']) : undefined
        },
        controller.signal
      ),
    restored() {
      assert.equal(pixelRatio, 2)
      assert.deepEqual([canvas.width, canvas.height], [2000, 1200])
      assert.equal(canvas.style.visibility, 'visible')
      assert.equal(layer.exportViewport, undefined)
      assert.equal(created[0].removed, true)
      assert.equal(created[1].width, 0)
      assert.deepEqual(
        maps.map(({ visible }) => visible),
        originalVisibility
      )
    },
    fills,
    captures: () => captures,
    capturedSize: () => capturedSize,
    capturedMaps,
    coveredMaps
  }
}

test('export viewport increases tile detail without changing the geographic extent', () => {
  const normal = printViewport(view)
  const print = printViewport(view, 4)
  assert.deepEqual(print.projectedGeoRectangle, normal.projectedGeoRectangle)
  assert.deepEqual(print.viewportSize, [4000, 2400])
  assert.equal(
    print.projectedGeoPerViewportScale,
    normal.projectedGeoPerViewportScale / 4
  )
})

test('raster export waits for new tile preparation and loading, then restores the existing canvas', async (t) => {
  const h = harness(t)
  assert.equal((await h.run()).type, 'image/jpeg')
  assert.equal(h.captures(), 1)
  h.restored()
})

test('custom export proportions resize only the buffer and restore the display aspect ratio', async (t) => {
  const h = harness(t)
  assert.equal(
    (await h.run({ ...view, width: 600, height: 900 })).type,
    'image/jpeg'
  )
  assert.equal(h.captures(), 1)
  assert.deepEqual(h.capturedSize(), [600, 900])
  h.restored()
})

test('cancelling or failed detail tiles restores the view without exporting a partial image', async (t) => {
  for (const options of [{ cancel: true }, { failed: true }]) {
    await t.test(JSON.stringify(options), async (t) => {
      const h = harness(t, options)
      await assert.rejects(
        h.run(),
        options.cancel ? /Cancelled/ : /tiles could not be loaded/
      )
      assert.equal(h.captures(), 0)
      h.restored()
    })
  }
})

test('empty views export without waiting for renderer tile preparation', async (t) => {
  const h = harness(t, { empty: true })
  assert.equal((await h.run()).type, 'image/jpeg')
  h.restored()
})

test('selected raster exports omit overlapping maps while the cover preserves the full canvas', async (t) => {
  const h = harness(t, { selected: true })
  await h.run()
  assert.deepEqual(h.coveredMaps, [['selected', 'unselected']])
  assert.deepEqual(h.capturedMaps, [['selected']])
  h.restored()
})

test('selected exports restore every map visibility after cancellation and loading failures', async (t) => {
  for (const options of [
    { cancel: true },
    { failed: true },
    { loadFailure: true }
  ]) {
    await t.test(JSON.stringify(options), async (t) => {
      const h = harness(t, { selected: true, ...options })
      await assert.rejects(
        h.run(),
        options.cancel
          ? /Cancelled/
          : options.failed
            ? /tiles could not be loaded/
            : /Info failed/
      )
      assert.equal(h.captures(), 0)
      h.restored()
    })
  }
})

test('SVG preparation skips unselected image services even when they overlap the export bounds', async () => {
  const selected = {
    mapId: 'selected',
    shouldRenderMap: () => true,
    hasImage: () => true
  }
  const layer = {
    renderer: {
      warpedMapList: {
        getWarpedMaps: () => [
          selected,
          {
            mapId: 'unselected',
            shouldRenderMap: () => true,
            fetchingImageInfo: true,
            addEventListener() {
              assert.fail('Must not wait for an unselected service')
            }
          }
        ]
      }
    }
  } as unknown as ExportableMapLayer
  assert.deepEqual(
    await loadExportImages(
      layer,
      view,
      new AbortController().signal,
      new Set(['selected'])
    ),
    [selected]
  )
  assert.deepEqual(
    await loadExportImages(
      layer,
      view,
      new AbortController().signal,
      new Set()
    ),
    []
  )
})

test('JPG backgrounds use the chosen color and default to white', async (t) => {
  for (const color of [undefined, '#e0f2e8', '#000000']) {
    await t.test(color ?? 'default', async (t) => {
      const h = harness(t)
      await h.run(view, color)
      assert.deepEqual(h.fills, [color ?? '#ffffff'])
      h.restored()
    })
  }
})

test('PNG export records the selected DPI and preserves encoded pixels', async (t) => {
  const png = new Blob(
    [
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
        'base64'
      )
    ],
    { type: 'image/png' }
  )
  const h = harness(t, { empty: true, encoded: png, dpi: 300 })
  const exported = await h.run(view, undefined, 'png')
  h.restored()
  assert.equal(exported.type, 'image/png')
  assert.equal(exported.size, png.size + 21)
  const data = Buffer.from(await exported.arrayBuffer())
  const at = data.indexOf('pHYs')
  assert.equal(data.readUInt32BE(at + 4), 11811)
  assert.equal(data.readUInt32BE(at + 8), 11811)
  assert.equal(data[at + 12], 1)
  assert.equal(data.readUInt32BE(at + 13), 0x78a53f76)
  const original = Buffer.from(await png.arrayBuffer())
  assert.deepEqual(
    data.subarray(data.indexOf('IDAT')),
    original.subarray(original.indexOf('IDAT'))
  )
})

test('JPEG export records the selected DPI and preserves encoded pixels', async (t) => {
  const h = harness(t, { empty: true, dpi: 300 })
  const exported = await h.run()
  h.restored()
  assert.equal(exported.type, 'image/jpeg')
  assert.equal(exported.size, jpeg.size)
  const data = Buffer.from(await exported.arrayBuffer())
  assert.equal(data[13], 1)
  assert.equal(data.readUInt16BE(14), 300)
  assert.equal(data.readUInt16BE(16), 300)
  assert.equal(data.indexOf('JFIF'), data.lastIndexOf('JFIF'))
  const original = Buffer.from(await jpeg.arrayBuffer())
  assert.deepEqual(data.subarray(0, 13), original.subarray(0, 13))
  assert.deepEqual(data.subarray(18), original.subarray(18))
})
