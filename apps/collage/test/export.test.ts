import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Image } from '@allmaps/iiif-parser'
import { generateAnnotation } from '@allmaps/annotation'
import { webMercatorToLonLat } from '@allmaps/project'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import {
  openCollage,
  mirrorMap,
  renderedMap,
  transformer
} from '../src/lib/model.ts'
import {
  imageDimensions,
  frameExportView,
  projectedToScreen,
  validateImageSize
} from '../src/lib/export-view.ts'
import type { ExportView } from '../src/lib/export-view.ts'
import {
  exportSvg,
  linkedImageUrl,
  svgMatrix,
  svgImageSize,
  linkedImageNotice
} from '../src/lib/export-svg.ts'
import { cachedImagePieces } from '../src/lib/export-svg-images.ts'

const view: ExportView = {
  width: 1000,
  height: 600,
  center: [0, 0],
  metersPerPixel: 2,
  bearing: 0
}
const image = (profile = 'level2', extra = {}) =>
  Image.parse({
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': 'https://example.org/iiif/map',
    protocol: 'http://iiif.io/api/image',
    width: 1000,
    height: 800,
    profile: [`http://iiif.io/api/image/2/${profile}.json`],
    tiles: [{ width: 256, scaleFactors: [1, 2, 4] }],
    ...extra
  })
const resourceMask: Point[] = [
  [0, 0],
  [1000, 0],
  [1000, 800],
  [0, 800]
]
const source: GeoreferencedMap = {
  type: 'GeoreferencedMap',
  resource: {
    id: 'https://example.org/iiif/map',
    type: 'ImageService2',
    width: 1000,
    height: 800
  },
  resourceMask,
  transformation: { type: 'helmert' },
  gcps: resourceMask.map((resource) => ({
    resource,
    geo: webMercatorToLonLat([resource[0] * 2, -resource[1] * 2])
  }))
}

test('printed scale uses comparable ground meters, with output dimensions independent of display DPI', () => {
  // 2 km at 1:10,000 prints 200 mm wide. At 254 DPI this is 2,000 px.
  assert.deepEqual(imageDimensions(view, 10000, 254), {
    width: 2000,
    height: 1200,
    ratio: 2
  })
  assert.equal(imageDimensions(view, 20000, 254).width, 1000)
  assert.equal(imageDimensions(view, 10000, 127).width, 1000)
  assert.deepEqual(projectedToScreen([125, 0], view), [1000, 300])
  assert.throws(() => imageDimensions(view, 0, 300), /scale/)
  assert.throws(() => imageDimensions(view, 10000, NaN), /DPI/)
  assert.throws(() => validateImageSize(9000, 10), /too large/)
  assert.throws(() => validateImageSize(6000, 6000), /too large/)
})

test('SVG matrices agree with resource transforms after rotation, translation, camera bearing and both mirrors', () => {
  for (const mirror of [undefined, 'horizontal', 'vertical'] as const) {
    const [item] = openCollage(generateAnnotation(source))
    if (mirror) mirrorMap(item, mirror)
    item.placement.rotation = 0.7
    item.placement.position = [330, -190]
    const camera = { ...view, bearing: 24 }
    const [a, b, c, d, e, f] = svgMatrix(item, camera)
    const convert = transformer(renderedMap(item))
    for (const [x, y] of [
      [0, 0],
      [500, 400],
      [1000, 800]
    ] as Point[]) {
      const expected = projectedToScreen(
        convert.transformToProjectedGeo([x, y]),
        camera
      )
      assert.ok(
        Math.hypot(
          a * x + c * y + e - expected[0],
          b * x + d * y + f - expected[1]
        ) < 1e-7
      )
    }
  }
})

test('entire-collage framing includes offscreen maps and adds margin without cropping at any bearing', () => {
  const points: Point[] = [
    [-250, -100],
    [500, -100],
    [500, 200],
    [-250, 200]
  ]
  for (const bearing of [0, 30, -90]) {
    const camera = { ...view, bearing }
    const tight = frameExportView(camera, points)
    const framed = frameExportView(camera, points, 10, 1)
    assert.equal(framed.width, framed.height)
    const projected = points.map((p) => projectedToScreen(p, framed))
    for (const [x, y] of projected) {
      assert.ok(x > 0 && x < framed.width && y > 0 && y < framed.height)
    }
    const xs = points.map((p) => projectedToScreen(p, tight)[0])
    const ys = points.map((p) => projectedToScreen(p, tight)[1])
    assert.ok(Math.abs(Math.min(...xs)) < 1e-8)
    assert.ok(Math.abs(Math.max(...xs) - tight.width) < 1e-8)
    assert.ok(Math.abs(Math.min(...ys)) < 1e-8)
    assert.ok(Math.abs(Math.max(...ys) - tight.height) < 1e-8)
  }
  const framed = frameExportView(view, undefined, 10, 1)
  assert.deepEqual(framed.center, view.center)
  // 2,000 × 1,200 m + 120 m margin per side; square adds vertical space.
  assert.equal(imageDimensions(framed, 10000, 254).width, 2240)
  assert.equal(imageDimensions(framed, 10000, 254).height, 2240)
  assert.throws(() => frameExportView(view, [], 0), /Add maps/)
  assert.throws(() => frameExportView(view, undefined, NaN), /margin/)
  assert.throws(
    () => frameExportView(view, undefined, 0, 0),
    /width and height/
  )
})

test('SVG maximum dimensions contain images and never use oversized fixed renditions', () => {
  assert.deepEqual(svgImageSize(image(), { width: 200, height: 100 }), {
    width: 125,
    height: 100
  })
  assert.match(
    linkedImageUrl(image(), { width: 200, height: 100 }),
    /\/full\/125,\//
  )
  const fixed = image('level0', {
    sizes: [
      { width: 300, height: 240 },
      { width: 125, height: 100 }
    ]
  })
  assert.match(
    linkedImageUrl(fixed, { width: 250, height: 250 }),
    /\/full\/125,\//
  )
  assert.throws(
    () => linkedImageUrl(fixed, { width: 100, height: 100 }),
    /full-image link/
  )
  assert.throws(
    () => svgImageSize(image(), { width: NaN, height: 100 }),
    /dimensions/
  )
  assert.deepEqual(
    svgImageSize(image('level2', { width: 10000, height: 10000 }), {
      width: 8192,
      height: 8192
    }),
    { width: 5656, height: 5656 }
  )
})

test('embedded SVG reuses sources while keeping individual matrices and masks', () => {
  const [first] = openCollage(generateAnnotation(source))
  const second = structuredClone(first)
  second.instanceId = 'copy'
  second.placement.rotation = 1
  const data = 'data:image/png;base64,cGl4ZWxz'
  const svg = exportSvg(
    [first, second],
    new Map([
      [first.instanceId, image()],
      [second.instanceId, image()]
    ]),
    view,
    {
      sources: new Map([
        [first.instanceId, data],
        [second.instanceId, data]
      ])
    }
  )
  assert.equal(svg.split(data).length - 1, 1)
  assert.equal((svg.match(/<use /g) ?? []).length, 2)
  assert.equal((svg.match(/<clipPath /g) ?? []).length, 2)
  assert.equal((svg.match(/transform="matrix\(/g) ?? []).length, 2)
  assert.doesNotMatch(svg, /example.org/)
})

test('cached SVG pixels require complete coverage at sufficient resolution, including edge tiles', () => {
  const size = { width: 1000, height: 800 }
  const output = { width: 500, height: 400 }
  const tile = (
    x: number,
    y: number,
    width: number,
    height: number,
    scale = 2
  ) => ({
    data: { width: 256, height: 256 } as ImageData,
    fetchableTile: {
      options: {
        imageRequest: {
          region: { x, y, width, height },
          size: {
            width: Math.ceil(width / scale),
            height: Math.ceil(height / scale)
          }
        }
      }
    }
  })
  const tiles = [
    tile(0, 0, 512, 512),
    tile(512, 0, 488, 512),
    tile(0, 512, 512, 288),
    tile(512, 512, 488, 288)
  ]
  assert.equal(cachedImagePieces(size, output, tiles)?.length, 4)
  assert.equal(cachedImagePieces(size, output, tiles.slice(0, 3)), undefined)
  assert.equal(cachedImagePieces(size, size, tiles), undefined)
  // Area sums are insufficient: an overlapping tile does not fill the gap.
  assert.equal(
    cachedImagePieces(size, output, [...tiles.slice(0, 3), tiles[0]]),
    undefined
  )
  assert.equal(cachedImagePieces(size, output, []), undefined)
})

test('SVG preserves stacking, resource-coordinate clipping, opacity and safe titles', () => {
  const [first] = openCollage(generateAnnotation(source))
  const second = structuredClone(first)
  second.instanceId = 'second'
  first.title = 'A <map> & "title"'
  second.title = 'Top map'
  first.appearance.opacity = 0.4
  first.appearance.saturation = 0
  first.appearance.colorize = true
  second.appearance.applyMask = false
  const svg = exportSvg(
    [first, second],
    new Map([
      [first.instanceId, image()],
      [second.instanceId, image()]
    ]),
    view
  )
  assert.ok(
    svg.indexOf('A &lt;map&gt; &amp; &quot;title&quot;') <
      svg.indexOf('Top map')
  )
  assert.match(svg, /opacity="0.4"/)
  assert.match(svg, /clipPathUnits="userSpaceOnUse"/)
  assert.match(svg, /points="0,0 1000,0 1000,800 0,800"/)
  assert.equal((svg.match(/clip-path=/g) ?? []).length, 1)
  assert.match(svg, /feColorMatrix/)
  assert.match(svg, /feComponentTransfer/)
  assert.match(svg, /href="https:\/\/example.org\/iiif\/map\/full/)
  assert.doesNotMatch(svg, /data:image/)
  first.baseline.transformation = { type: 'thinPlateSpline' }
  assert.throws(() => svgMatrix(first, view), /supports Helmert/)
})

test('SVG image links honor service limits and declared sizes, rejecting tile-only services', () => {
  assert.match(
    linkedImageUrl(
      image('level2', {
        profile: ['http://iiif.io/api/image/2/level2.json', { maxWidth: 500 }]
      })
    ),
    /\/full\/500,\//
  )
  assert.match(
    linkedImageUrl(image('level0', { sizes: [{ width: 250, height: 200 }] })),
    /\/full\/250,\//
  )
  assert.throws(() => linkedImageUrl(image('level0')), /full-image link/)
})

test('SVG export omits unsupported background removal and supports independent effect choices', () => {
  const [item] = openCollage(generateAnnotation(source))
  Object.assign(item.appearance, {
    opacity: 0.4,
    saturation: 0,
    colorize: true,
    removeBackground: true,
    backgroundColor: '#ffffff'
  })
  const images = new Map([[item.instanceId, image()]])
  const original = structuredClone(item)
  const enabled = exportSvg([item], images, view)
  assert.match(enabled, /opacity="0.4"/)
  assert.match(enabled, /feColorMatrix/)
  assert.match(enabled, /feComponentTransfer/)
  const disabled = exportSvg([item], images, view, {
    effects: {
      opacity: false,
      saturation: false,
      colorize: false,
      removeBackground: false
    }
  })
  assert.match(disabled, /opacity="1"/)
  assert.doesNotMatch(disabled, /<filter|feColorMatrix|feComponentTransfer/)
  assert.match(disabled, /clip-path=/)
  assert.equal(svgMatrix(item, view).length, 6)
  assert.deepEqual(item, original)
})

test('linked fixed-size image notices identify the actual rendition without blocking export', () => {
  const fixed = image('level0', { sizes: [{ width: 250, height: 200 }] })
  assert.match(linkedImageNotice(fixed)!, /250 × 200 px/)
  assert.match(linkedImageUrl(fixed), /250,/)
  assert.equal(linkedImageNotice(image()), undefined)
  assert.equal(linkedImageNotice(fixed, { width: 100, height: 100 }), undefined)
})
