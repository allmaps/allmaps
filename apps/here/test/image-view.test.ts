import assert from 'node:assert/strict'
import { test } from 'node:test'

import { GcpTransformer } from '@allmaps/transform'
import {
  createImageView,
  getImageBearing,
  getPositionRotation
} from '../src/lib/shared/image-view.ts'

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
