import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MercatorCoordinate } from 'maplibre-gl'
import { GcpTransformer } from '@allmaps/transform'
import {
  createImageView,
  getImageBearing,
  getPositionRotation
} from '../src/lib/shared/image-view.ts'
import { lineBearing, pointOnPolygon } from '../src/lib/shared/outside.ts'

import type { MapWithImageInfo } from '../src/lib/shared/types.ts'
import type { Point } from '@allmaps/types'

function fixture(width = 4000, height = 2000): MapWithImageInfo {
  return {
    mapId: 'test-map',
    map: {
      '@context': 'https://schemas.allmaps.org/map/2/context.json',
      type: 'GeoreferencedMap',
      id: 'test-map',
      resource: {
        id: 'https://example.org/image',
        type: 'ImageService2',
        width,
        height
      },
      resourceMask: [
        [100, 100],
        [1000, 100],
        [1000, 1000]
      ],
      transformation: { type: 'polynomial' },
      gcps: [
        { resource: [0, 0], geo: [4, 53] },
        { resource: [width, 0], geo: [5, 53] },
        { resource: [0, height], geo: [4, 52] }
      ]
    },
    imageInfo: {
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': 'https://example.org/image',
      protocol: 'http://iiif.io/api/image',
      profile: ['http://iiif.io/api/image/2/level2.json'],
      width,
      height,
      tiles: [{ width: 512, scaleFactors: [1, 2, 4, 8] }]
    }
  }
}

function near(actual: Point, expected: Point, tolerance = 1e-7) {
  assert.ok(
    Math.abs(actual[0] - expected[0]) < tolerance,
    `${actual} != ${expected}`
  )
  assert.ok(
    Math.abs(actual[1] - expected[1]) < tolerance,
    `${actual} != ${expected}`
  )
}

function screenProjector(
  view: ReturnType<typeof createImageView>,
  bearing = 0,
  zoom = 10,
  screenCenter: Point = [600, 400]
) {
  const center = MercatorCoordinate.fromLngLat(view.toLngLat([2000, 1000]))
  const worldSize = 512 * 2 ** zoom
  const angle = (-bearing * Math.PI) / 180

  return (coordinates: Point) => {
    const projected = MercatorCoordinate.fromLngLat(coordinates)
    assert.ok(Number.isFinite(projected.x) && Number.isFinite(projected.y))
    const horizontalOffset = (projected.x - center.x) * worldSize
    const verticalOffset = (projected.y - center.y) * worldSize
    return {
      x:
        screenCenter[0] +
        horizontalOffset * Math.cos(angle) -
        verticalOffset * Math.sin(angle),
      y:
        screenCenter[1] +
        horizontalOffset * Math.sin(angle) +
        verticalOffset * Math.cos(angle)
    }
  }
}

test('image view uses the editor’s straight annotation coordinates', () => {
  for (const [width, height] of [
    [4000, 2000],
    [2000, 6000],
    [100000, 80000]
  ]) {
    const original = fixture(width, height)
    const before = structuredClone(original)
    const view = createImageView(original)
    const transformer = new GcpTransformer(view.map.gcps, 'straight')
    const points: Point[] = [
      [0, 0],
      [width, height],
      [width / 2, height / 2],
      [123, 456]
    ]
    for (const point of points) {
      const expected: Point = [point[0] / 10_000, (height - point[1]) / 10_000]
      near(transformer.transformToGeo(point), expected)
      near(view.toLngLat(point), expected)
    }
    assert.deepEqual(original, before)
    assert.deepEqual(view.map.resourceMask, [
      [0, 0],
      [0, height],
      [width, height],
      [width, 0]
    ])
    assert.ok(view.bounds[0][0] < view.bounds[1][0])
    assert.ok(view.bounds[0][1] < view.bounds[1][1])
  }
})

test('geographical locations pass through the original resource transform', () => {
  const original = fixture()
  const view = createImageView(original)
  const transformer = new GcpTransformer(original.map.gcps, 'polynomial')
  const resource = transformer.transformToResource([4.5, 52.5])
  near(resource, [2000, 1000])
  near(view.toLngLat(resource), [0.2, 0.1])
})

test('normal positions retain their exact Mercator screen projection', () => {
  const view = createImageView(fixture())
  for (const bearing of [0, 45, 90, 180]) {
    const project = screenProjector(view, bearing, 12, [400, 200])
    for (const point of [
      [0, 0],
      [123, 456],
      [4000, 2000]
    ] satisfies Point[]) {
      const coordinates = view.toProjectableLngLat(point)
      assert.ok(coordinates)
      near(coordinates, view.toLngLat(point))
      const expected = project(coordinates)
      const screenCoordinates = view.toScreenCoordinates(point, project)
      assert.ok(screenCoordinates)
      near(screenCoordinates, [expected.x, expected.y])
    }
  }
})

test('a distant GPS location retains an outside-map indicator', () => {
  const original = fixture()
  original.map.gcps = [
    { resource: [0, 0], geo: [4, 52.001] },
    { resource: [4000, 0], geo: [4.002, 52.001] },
    { resource: [0, 2000], geo: [4, 52] }
  ]
  const view = createImageView(original)
  const transformer = new GcpTransformer(original.map.gcps, 'polynomial')
  const resource = transformer.transformToResource([4.001, 53])
  near(view.toLngLat(resource), [0.2, 200], 1e-6)
  assert.equal(view.toProjectableLngLat(resource), undefined)

  const screenCoordinates = view.toScreenCoordinates(
    resource,
    screenProjector(view)
  )
  assert.ok(screenCoordinates)
  const indicator = pointOnPolygon([600, 400], screenCoordinates, [
    [0, 0],
    [1200, 0],
    [1200, 800],
    [0, 800]
  ])
  assert.ok(indicator)
  near(indicator, [600, 0], 1e-5)
})

test('distant positions preserve screen direction as the camera rotates', () => {
  const view = createImageView(fixture())
  const directions: Point[] = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1]
  ]
  for (const bearing of [0, 90, 180, 270]) {
    const project = screenProjector(view, bearing)
    for (const direction of directions) {
      const resource: Point = [
        2000 + direction[0] * 2_000_000,
        1000 + direction[1] * 2_000_000
      ]
      const screenCoordinates = view.toScreenCoordinates(resource, project)
      assert.ok(screenCoordinates)
      const expectedBearing =
        (lineBearing([0, 0], direction) - bearing + 360) % 360
      const actualBearing = lineBearing([600, 400], screenCoordinates)
      const difference = ((actualBearing - expectedBearing + 540) % 360) - 180
      assert.ok(Math.abs(difference) < 0.001)
      const indicator = pointOnPolygon([600, 400], screenCoordinates, [
        [0, 0],
        [1200, 0],
        [1200, 800],
        [0, 800]
      ])
      assert.ok(indicator)
      assert.ok(indicator.every(Number.isFinite))
    }
  }
})

test('markers outside Mercator latitude limits use the screen fallback', () => {
  const view = createImageView(fixture())
  for (const latitude of [-200, -90, -89, 89, 90, 200]) {
    const resource: Point = [2000, 2000 - latitude * 10_000]
    assert.equal(view.toProjectableLngLat(resource), undefined)
    const screenCoordinates = view.toScreenCoordinates(
      resource,
      screenProjector(view)
    )
    assert.ok(screenCoordinates)
    assert.ok(screenCoordinates.every(Number.isFinite))
  }
})

test('non-finite resource positions do not reach the map projection', () => {
  const view = createImageView(fixture())
  const project = () => {
    assert.fail('Non-finite coordinates must not be projected')
  }
  for (const point of [
    [NaN, 0],
    [0, Infinity],
    [-Infinity, 0]
  ] satisfies Point[]) {
    assert.equal(view.toProjectableLngLat(point), undefined)
    assert.equal(view.toScreenCoordinates(point, project), undefined)
  }
})

test('zoom limits match the editor resource view', () => {
  const view = createImageView(fixture())
  assert.equal(view.minZoom, 7)
  assert.equal(view.maxZoom, 18)
  // With levels 1–8, start 0.75 zoom levels below native pixel resolution.
  const screenPixelsPerImagePixel =
    (512 * 2 ** view.positionZoom) / (360 * 10_000)
  assert.ok(Math.abs(screenPixelsPerImagePixel - 2 ** -0.75) < 1e-10)
})

test('compass modes preserve rotation direction and accept a zero heading', () => {
  assert.equal(getImageBearing('image', 30, 0), 0)
  assert.equal(getImageBearing('north', 30, 0), -30)
  assert.equal(getImageBearing('follow-orientation', 30, 0), -15)
  assert.equal(getImageBearing('follow-orientation', 30, 90), -105)
  assert.equal(getImageBearing('custom', 30, 90), undefined)
  assert.equal(getImageBearing('north'), undefined)
  assert.equal(getImageBearing('follow-orientation', 30), undefined)
  assert.equal(getPositionRotation('image', 30, 0), -120)
  assert.equal(getPositionRotation('follow-orientation', 30, 90), 0)
})
