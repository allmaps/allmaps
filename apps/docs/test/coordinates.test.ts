import assert from 'node:assert/strict'
import test from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import {
  createCoordinateExample,
  initialImagePoint,
  createImageTileGrid
} from '../src/lib/coordinates.ts'

const annotation = generateAnnotation({
  type: 'GeoreferencedMap',
  '@context': 'https://schemas.allmaps.org/map/2/context.json',
  resource: {
    id: 'https://example.org/image',
    type: 'ImageService2',
    width: 30387,
    height: 8460
  },
  resourceMask: [
    [0, 0],
    [30387, 0],
    [30387, 8460],
    [0, 8460]
  ],
  gcps: [
    { resource: [0, 0], geo: [-74, 40.7] },
    { resource: [30387, 0], geo: [-73.8, 40.7] },
    { resource: [0, 8460], geo: [-74, 40.9] }
  ],
  transformation: { type: 'polynomial', options: { order: 1 } }
})

test('the starting point uses image pixels and longitude before latitude', () => {
  const model = createCoordinateExample(annotation)
  const point = model.fromPixels(initialImagePoint)
  assert.equal(model.width, 30387)
  assert.equal(model.height, 8460)
  assert.ok(
    Math.abs(
      point.geographic[0] - (-74 + (initialImagePoint[0] / 30387) * 0.2)
    ) < 0.000001
  )
  assert.ok(
    Math.abs(
      point.geographic[1] - (40.7 + (initialImagePoint[1] / 8460) * 0.2)
    ) < 0.000001
  )
})

test('points selected on either view return to the same original image pixels', () => {
  const model = createCoordinateExample(annotation)
  for (const point of [
    [8605, 4094],
    [10000, 4000],
    [25000, 3000]
  ] as [number, number][]) {
    const selected = model.fromPixels(point)
    const restored = model.fromGeographic(selected.geographic)
    assert.ok(Math.abs(restored.image[0] - point[0]) < 0.00001)
    assert.ok(Math.abs(restored.image[1] - point[1]) < 0.00001)
    assert.deepEqual(restored.geographic, selected.geographic)
  }
})

test('panning beyond the photograph stays at a valid image edge', () => {
  const model = createCoordinateExample(annotation)
  assert.deepEqual(model.fromPixels([-100, 9000], true).image, [0, 8460])
  const constrained = model.fromGeographic([0, 0], true)
  assert.ok(constrained.image[0] >= 0 && constrained.image[0] <= model.width)
  assert.ok(constrained.image[1] >= 0 && constrained.image[1] <= model.height)
  assert.throws(() => model.fromPixels([-1, 20]), /inside the photograph/)
  assert.throws(() => model.fromPixels([NaN, 0]), /Invalid image coordinates/)
  assert.throws(() => model.fromGeographic([200, 40]), /Invalid longitude/)
})

test('the display grid preserves image pixel coordinates in both directions', () => {
  const grid = createImageTileGrid(30387, 8460)
  for (const point of [
    [0, 0],
    [8605, 4094],
    [30387, 8460]
  ] as [number, number][]) {
    const restored = grid.fromWorld(grid.toWorld(point))
    assert.ok(Math.abs(restored[0] - point[0]) < 0.00001)
    assert.ok(Math.abs(restored[1] - point[1]) < 0.00001)
  }
})

test('IIIF edge tiles have padding instead of stretching the photograph', () => {
  const grid = createImageTileGrid(30387, 8460)
  assert.equal(grid.maxZoom, 7)
  assert.deepEqual(grid.getRegion(7, 34, 55), {
    region: [0, 0, 346, 134],
    size: [346, 134],
    offset: [166, 378]
  })
  assert.deepEqual(grid.getRegion(5, 11, 16), {
    region: [4954, 4230, 2048, 2048],
    size: [512, 512],
    offset: [0, 0]
  })
  assert.equal(grid.getRegion(7, 0, 0), undefined)
})
