import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Image } from '@allmaps/iiif-parser'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ExportableMapLayer } from '../src/lib/export-layer.ts'
import { CANVAS_SCALE } from '../src/lib/coordinates.ts'
import { svgMatrix } from '../src/lib/export-svg.ts'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { generateAnnotation } from '@allmaps/annotation'
import { webMercatorToLonLat } from '@allmaps/project'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import {
  openCollage,
  mirrorMap,
  setMapTransform,
  outline
} from '../src/lib/model.ts'
import type { ExportView } from '../src/lib/export-view.ts'
import { imageDimensions, projectedToScreen } from '../src/lib/export-view.ts'
import {
  pdfLayout,
  pdfPageSizes,
  pdfImageMaximum,
  pdfMapNeedsRaster,
  pdfRasterFrame
} from '../src/lib/pdf-layout.ts'
import {
  writePdf,
  drawPdfMap,
  drawPdfMapLink,
  exportPdf
} from '../src/lib/export-pdf.ts'

const view: ExportView = {
  width: 1000,
  height: 500,
  center: [0, 0],
  metersPerPixel: 2,
  bearing: 0
}
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
const mask: Point[] = [
  [0, 0],
  [1000, 0],
  [1000, 800],
  [0, 800]
]
function map() {
  const source: GeoreferencedMap = {
    type: 'GeoreferencedMap',
    resource: {
      id: 'https://example.org/iiif/map',
      type: 'ImageService2',
      width: 1000,
      height: 800
    },
    resourceMask: mask,
    transformation: { type: 'helmert' },
    gcps: mask.map((resource) => ({
      resource,
      geo: webMercatorToLonLat([resource[0] * 2, -resource[1] * 2])
    }))
  }
  return openCollage(generateAnnotation(source))[0]
}

test('PDF fit preserves ground scale and centers content inside physical page margins', () => {
  const layout = pdfLayout(view, { width: 210, height: 297 })
  close(layout.page.width, (210 * 72) / 25.4)
  close(layout.view.width, (168 * 72) / 25.4)
  close(layout.view.height, (84 * 72) / 25.4)
  close(layout.offset[0], (21 * 72) / 25.4)
  close(layout.offset[1], (((297 - 84) / 2) * 72) / 25.4)
  close(layout.scale, 2000 / 0.168)
  close(layout.view.width * layout.view.metersPerPixel, 2000)
  assert.deepEqual(layout.view.center, view.center)
  const pixels = imageDimensions(layout.view, layout.scale, 254)
  assert.equal(pixels.width, 1680)
  assert.equal(pixels.height, 840)
  for (const [width, height] of Object.values(pdfPageSizes)) {
    const paper = pdfLayout(view, { width, height })
    close(paper.page.width, (width * 72) / 25.4)
    assert.ok(paper.offset.every((n) => n >= 0))
  }
})

test('exact PDF scale never silently shrinks or crops the selected export frame', () => {
  const layout = pdfLayout(
    { ...view, bearing: 32 },
    { width: 300, height: 200 },
    10,
    10000
  )
  close(layout.view.width, (200 * 72) / 25.4)
  close(layout.view.height, (100 * 72) / 25.4)
  close(layout.scale, 10000)
  assert.equal(layout.view.bearing, 32)
  assert.throws(
    () => pdfLayout(view, { width: 210, height: 297 }, 10, 10000),
    /does not fit/
  )
  for (const scale of [0, -1, NaN, Infinity])
    assert.throws(
      () => pdfLayout(view, { width: 210, height: 297 }, 10, scale),
      /scale/
    )
  for (const width of [0, NaN, Infinity, 5001])
    assert.throws(() => pdfLayout(view, { width, height: 297 }), /dimensions/)
  for (const margin of [-1, 50, NaN])
    assert.throws(
      () => pdfLayout(view, { width: 210, height: 297 }, margin),
      /margin/
    )
})

test('PDF image detail accounts for shear, DPI and per-image bounds independently of page size', () => {
  const image = { width: 1000, height: 800 }
  assert.deepEqual(pdfImageMaximum([1, 0, 0, 1, 0, 0], image, 72), {
    width: 1000,
    height: 1000
  })
  assert.equal(pdfImageMaximum([0, -1, -1, 0, 0, 0], image, 144).width, 2000)
  assert.equal(pdfImageMaximum([1, 0, 1, 1, 0, 0], image, 72).width, 1619)
  assert.equal(pdfImageMaximum([100, 0, 0, 100, 0, 0], image, 300).width, 8192)
  assert.throws(() => pdfImageMaximum([1, 0, 0, 1], image, 0), /DPI/)
})

test('PDF keeps affine geometry native with every appearance effect', () => {
  const item = map()
  assert.equal(pdfMapNeedsRaster(item), false)
  item.appearance.opacity = 0.4
  mirrorMap(item)
  setMapTransform(item, { scaleX: 1.2, scaleY: 0.8, skewX: 0.3, skewY: 0.2 })
  assert.equal(pdfMapNeedsRaster(item), false)
  for (const appearance of [
    { saturation: 0 },
    { colorize: true },
    { removeBackground: true, backgroundColor: '#ffffff' }
  ]) {
    const copy = structuredClone(item)
    Object.assign(copy.appearance, appearance)
    assert.equal(pdfMapNeedsRaster(copy), false)
  }
})

test('PDFKit writes one physical page with separate affine images, vector clips and shared image data', async () => {
  const item = map()
  const copy = structuredClone(item)
  copy.instanceId = 'copy'
  mirrorMap(copy)
  copy.placement.rotation = 0.7
  copy.appearance.opacity = 0.5
  setMapTransform(copy, { scaleX: 1.2, scaleY: 0.8, skewX: 0.3, skewY: 0.2 })
  const source =
    'data:image/jpeg;base64,' +
    readFileSync(
      new URL('./fixtures/export-pixel.jpg', import.meta.url)
    ).toString('base64')
  const layout = pdfLayout(view, { width: 297, height: 210 })
  const blob = await writePdf(
    layout,
    '#ffffff',
    (doc) => {
      for (const target of [item, copy])
        drawPdfMap(doc, target, layout.view, source)
    },
    new AbortController().signal
  )
  assert.equal(blob.type, 'application/pdf')
  const bytes = Buffer.from(await blob.arrayBuffer())
  const text = bytes.toString('latin1')
  assert.ok(text.startsWith('%PDF-1.4'))
  assert.equal((text.match(/\/Type \/Page\b/g) ?? []).length, 1)
  assert.equal((text.match(/\/Subtype \/Image\b/g) ?? []).length, 1)
  assert.match(text, /\/ca 0\.5/)
  const dimensions = text.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/)!
  close(Number(dimensions[1]), layout.page.width)
  close(Number(dimensions[2]), layout.page.height)
  const streams = [...text.matchAll(/<<([^]*?)>>\nstream\n([^]*?)\nendstream/g)]
    .filter((m) => m[1].includes('/FlateDecode'))
    .map((m) => inflateSync(Buffer.from(m[2], 'latin1')).toString())
    .join('\n')
  assert.equal((streams.match(/\bW n/g) ?? []).length, 3) // Page frame and two map masks.
  assert.equal((streams.match(/\/I1 Do/g) ?? []).length, 2)
  assert.match(streams, /1000 800 l/)
})

test('cancelled PDF generation rejects without leaving a completed download', async () => {
  const controller = new AbortController()
  await assert.rejects(
    writePdf(
      pdfLayout(view, { width: 210, height: 297 }),
      '#ffffff',
      () => {
        controller.abort(new DOMException('Cancelled', 'AbortError'))
      },
      controller.signal
    ),
    { name: 'AbortError' }
  )
  await assert.rejects(
    writePdf(
      pdfLayout(view, { width: 210, height: 297 }),
      '#ffffff',
      () => {
        assert.fail('An already cancelled export must not draw')
      },
      controller.signal
    ),
    { name: 'AbortError' }
  )
})

test('individual raster frames preserve point positions, DPI and page clipping at any bearing', () => {
  const unit = view.metersPerPixel * CANVAS_SCALE
  const mask: Point[] = [
    [-100 * unit, -40 * unit],
    [100 * unit, -40 * unit],
    [100 * unit, 40 * unit],
    [-100 * unit, 40 * unit]
  ]
  for (const bearing of [0, 35, -120]) {
    const page = { ...view, bearing }
    const frame = pdfRasterFrame(page, mask, 300)!
    assert.ok(frame.view.width < page.width && frame.view.height < page.height)
    assert.equal(frame.view.metersPerPixel, page.metersPerPixel)
    assert.equal(frame.view.bearing, page.bearing)
    for (const point of mask) {
      const original = projectedToScreen(point, page)
      const cropped = projectedToScreen(point, frame.view)
      close(original[0], cropped[0] + frame.offset[0])
      close(original[1], cropped[1] + frame.offset[1])
    }
    const pixels = imageDimensions(
      frame.view,
      (page.metersPerPixel * 72) / 0.0254,
      300
    )
    close(pixels.width, (frame.view.width * 300) / 72)
    close(pixels.height, (frame.view.height * 300) / 72)
  }
  const clipped = pdfRasterFrame(
    view,
    [
      [-1e6, -1e6],
      [1e6, -1e6],
      [1e6, 1e6],
      [-1e6, 1e6]
    ],
    300
  )!
  assert.deepEqual(clipped.offset, [0, 0])
  assert.ok(clipped.view.width - view.width < 72 / 300)
  assert.equal(
    pdfRasterFrame(
      view,
      [
        [1e9, 1e9],
        [1e9 + 1, 1e9 + 1]
      ],
      300
    ),
    undefined
  )
  assert.equal(pdfRasterFrame(view, [], 300), undefined)
})

test('non-affine PDF renders maps alone, preserving vector masks, opacity and appearance state', async (t) => {
  const native = map()
  native.instanceId = 'native'
  const gray = structuredClone(native)
  gray.instanceId = 'gray'
  gray.appearance.saturation = 0
  const colored = structuredClone(native)
  colored.instanceId = 'colored'
  colored.appearance.colorize = true
  gray.baseline.transformation = { type: 'thinPlateSpline' }
  colored.baseline.transformation = { type: 'thinPlateSpline' }
  gray.appearance.opacity = 0.35
  const items = [gray, native, colored]
  const image = Image.parse({
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': 'https://example.org/iiif/map',
    protocol: 'http://iiif.io/api/image',
    width: 1000,
    height: 800,
    profile: ['http://iiif.io/api/image/2/level2.json']
  })
  const maps = items.map((item) => ({
    mapId: item.instanceId,
    visible: true,
    mapOptions: {
      opacity: item.appearance.opacity,
      saturation: item.appearance.saturation,
      colorize: item.appearance.colorize,
      removeColor: false,
      applyMask: true
    },
    image,
    hasImage: () => true,
    shouldRenderMap() {
      return this.visible
    },
    projectedGeoAppliedMask: outline(item).map(([x, y]) => [
      x * CANVAS_SCALE,
      y * CANVAS_SCALE
    ]),
    projectedGeoFullMask: outline(item).map(([x, y]) => [
      x * CANVAS_SCALE,
      y * CANVAS_SCALE
    ]),
    fetchableTilesForViewport: []
  }))
  const canvas = {
    width: 1000,
    height: 500,
    style: { visibility: '' },
    parentElement: { append() {} }
  }
  const captured: string[][] = []
  const created: { width: number; height: number }[] = []
  const png = new Blob(
    [
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DQAAAEgQGALFXOsAAAAABJRU5ErkJggg==',
        'base64'
      )
    ],
    { type: 'image/png' }
  )
  const globals = ['document', 'FileReader'] as const
  const descriptors = globals.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name)
  )
  t.after(() =>
    globals.forEach((name, i) => {
      if (descriptors[i])
        Object.defineProperty(globalThis, name, descriptors[i]!)
      else Reflect.deleteProperty(globalThis, name)
    })
  )
  Object.assign(globalThis, {
    document: {
      createElement() {
        const index = created.length
        const node = {
          width: 0,
          height: 0,
          setAttribute() {},
          remove() {},
          getContext: () => ({
            drawImage() {
              if (index % 2 === 1)
                captured.push(maps.filter((m) => m.visible).map((m) => m.mapId))
            }
          }),
          toBlob: (callback: BlobCallback) => callback(png)
        }
        created.push(node)
        return node
      }
    },
    FileReader: class {
      result?: ArrayBuffer
      onload?: () => void
      async readAsArrayBuffer(blob: Blob) {
        this.result = await blob.arrayBuffer()
        this.onload?.()
      }
    }
  })
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
    exportViewport: undefined,
    getWarpedMap: (id: string) => maps.find((m) => m.mapId === id),
    setMapOptions(
      id: string,
      options: { visible?: boolean; opacity?: number }
    ) {
      const item = maps.find((m) => m.mapId === id)!
      if (options.visible !== undefined) item.visible = options.visible
      Object.assign(item.mapOptions, options)
    },
    renderer: {
      gl,
      previousSignificantViewport: undefined,
      tileCache: Object.assign(new EventTarget(), {
        finished: true,
        getMapCachedTiles: () => []
      }),
      warpedMapList: {
        getMapIds: () => maps.map((m) => m.mapId),
        getWarpedMaps: () => maps.filter((m) => m.visible)
      }
    }
  }
  const events = new EventTarget()
  const maplibre = {
    stop() {},
    getCanvas: () => canvas,
    getPixelRatio: () => 1,
    setPixelRatio() {
      canvas.width = 1000
      canvas.height = 500
    },
    on: (event: string, fn: EventListener) =>
      events.addEventListener(event, fn),
    off: (event: string, fn: EventListener) =>
      events.removeEventListener(event, fn),
    triggerRepaint() {
      setTimeout(() => {
        layer.renderer.previousSignificantViewport = layer.exportViewport
        events.dispatchEvent(new Event('render'))
      }, 0)
    }
  }
  const layout = pdfLayout(view, { width: 297, height: 210 })
  const maximum = pdfImageMaximum(svgMatrix(native, layout.view), image, 96)
  const cache = new Map([
    [
      JSON.stringify([image.uri, maximum.width, maximum.height]),
      'data:image/jpeg;base64,' +
        readFileSync(
          new URL('./fixtures/export-pixel.jpg', import.meta.url)
        ).toString('base64')
    ]
  ])
  const result = await exportPdf(
    maplibre as unknown as MapLibreMap,
    layer as unknown as ExportableMapLayer,
    items,
    layout,
    { dpi: 96, background: '#ffffff' },
    new AbortController().signal,
    cache
  )
  assert.deepEqual(captured, [['gray'], ['colored']])
  assert.equal(maps[0].mapOptions.opacity, 0.35)
  assert.equal(maps[0].mapOptions.applyMask, true)
  assert.ok(maps.every((m) => m.visible))
  assert.equal(layer.exportViewport, undefined)
  assert.equal(canvas.style.visibility, '')
  assert.ok(created.every((c) => c.width === 0 && c.height === 0))
  const text = Buffer.from(await result.arrayBuffer()).toString('latin1')
  const streams = [...text.matchAll(/<<([^]*?)>>\nstream\n([^]*?)\nendstream/g)]
    .filter((m) => m[1].includes('/FlateDecode'))
    .map((m) => inflateSync(Buffer.from(m[2], 'latin1')).toString())
    .join('\n')
  assert.deepEqual(streams.match(/\/I\d+ Do/g), ['/I1 Do', '/I2 Do', '/I3 Do'])
})

test('PDF adds Viewer URI annotations only for available source URLs and visible map bounds', async () => {
  const item = map()
  item.sourceUrl = 'https://example.org/annotations?id=123&x=2'
  const stored = structuredClone(item)
  stored.sourceUrl = undefined
  stored.baseline._allmaps = { id: 'https://example.org/original' }
  const missing = map()
  const layout = pdfLayout(view, { width: 210, height: 297 })
  const mask: Point[] = [
    [-100, -100],
    [100, -100],
    [100, 100],
    [-100, 100]
  ]
  const blob = await writePdf(
    layout,
    '#ffffff',
    (doc) => {
      drawPdfMapLink(doc, item, layout.view, mask)
      drawPdfMapLink(doc, stored, layout.view, mask)
      drawPdfMapLink(doc, missing, layout.view, mask)
      drawPdfMapLink(doc, item, layout.view, [
        [1e10, 1e10],
        [1e10 + 1, 1e10 + 1]
      ])
    },
    new AbortController().signal
  )
  const text = Buffer.from(await blob.arrayBuffer()).toString('latin1')
  assert.equal((text.match(/\/Subtype \/Link/g) ?? []).length, 2)
  assert.ok(
    text.includes(
      'https://viewer.allmaps.org/?url=https%3A%2F%2Fexample.org%2Fannotations%3Fid%3D123%26x%3D2'
    )
  )
  assert.ok(
    text.includes(
      'https://viewer.allmaps.org/?url=https%3A%2F%2Fexample.org%2Foriginal'
    )
  )
  assert.equal((text.match(/\/Border \[0 0 0\]/g) ?? []).length, 2)
})
