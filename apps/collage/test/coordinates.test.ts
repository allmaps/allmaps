import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import { lonLatToWebMercator } from '@allmaps/project'
import {
  CANVAS_SCALE,
  MAX_COLLAGE_COORDINATE,
  toCanvasGeo,
  fromCanvasGeo
} from '../src/lib/coordinates.ts'
import {
  openCollage,
  exportCollage,
  outline,
  placedMap,
  renderedMap,
  transformer,
  rotatePlacement
} from '../src/lib/model.ts'
import { solveLayout } from '../src/lib/layout-task.ts'
import { maskCoordinates } from '../src/lib/mask-geometry.ts'
import { bounds } from '../src/lib/geometry.ts'
import { overlaps } from '../src/lib/prism.ts'
import type { Point } from '@allmaps/types'

const { maps }: { maps: GeoreferencedMap[] } = JSON.parse(
  readFileSync(new URL('./fixtures/ortelius.json', import.meta.url), 'utf8')
)
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])

test('Ortelius imports, renders and reopens beyond the old world extent at unchanged scale', () => {
  const { items, fallback } = solveLayout({
    type: 'add',
    input: generateAnnotation(maps),
    at: [0, 0]
  })
  assert.equal(items.length, 146)
  assert.equal(fallback, false)
  const rectangles = items.map((item) => bounds(outline(item)))
  assert.ok(rectangles.flat().some((value) => Math.abs(value) > 20_000_000))
  const boxes = rectangles.map(([l, b, r, t]) => ({
    x: (l + r) / 2,
    y: (b + t) / 2,
    w: r - l,
    h: t - b
  }))
  assert.equal(
    overlaps(
      boxes,
      boxes.map((b) => [b.x, b.y])
    ).length,
    0
  )
  const reopened = openCollage(exportCollage(items))
  items.forEach((item, i) => {
    const rendered = transformer(renderedMap(item))
    const actual = transformer(placedMap(item))
    item.resourceMask.forEach((pixel) => {
      const world = actual.transformToProjectedGeo(pixel)
      const drawing = rendered.transformToProjectedGeo(pixel)
      assert.ok(
        distance(drawing, [world[0] * CANVAS_SCALE, world[1] * CANVAS_SCALE]) <
          0.001
      )
      assert.ok(drawing.every((value) => Math.abs(value) < 20_000_000))
    })
    outline(item).forEach((point, j) =>
      assert.ok(distance(point, outline(reopened[i])[j]) < 0.001)
    )
  })
})

test('dragging, rotation and mask editing use the same enlarged canvas coordinates', () => {
  const [item] = openCollage(generateAnnotation(maps[0]))
  item.placement.position = [35_000_000, -24_000_000]
  item.placement = rotatePlacement(item.placement, item.placement.position, 0.3)
  const original = structuredClone(item)
  const pixels: Point[] = [
    [500, 500],
    [1000, 800]
  ]
  const mask = maskCoordinates(item, true)
  const render = transformer(renderedMap(item))
  for (const point of pixels) {
    const geo = mask.toGeo(point)
    assert.ok(
      distance(
        lonLatToWebMercator(geo),
        render.transformToProjectedGeo(point)
      ) < 0.001
    )
    // A fresh converter exercises the inverse, without its exact-vertex cache.
    assert.ok(
      distance(maskCoordinates(item, true).toResource(geo), point) < 0.001
    )
  }
  for (const point of outline(item)) {
    assert.ok(distance(fromCanvasGeo(toCanvasGeo(point)), point) < 0.001)
    const delta: Point = [5000, -6000]
    const next = fromCanvasGeo(
      toCanvasGeo([point[0] + delta[0], point[1] + delta[1]])
    )
    assert.ok(distance([next[0] - point[0], next[1] - point[1]], delta) < 0.001)
  }
  assert.deepEqual(item, original)
})

test('nonfinite placements and numerically unsafe Mercator coordinates are still rejected', () => {
  const [item] = openCollage(generateAnnotation(maps[0]))
  for (const x of [Infinity, NaN, MAX_COLLAGE_COORDINATE * 2]) {
    item.placement.position = [x, 0]
    assert.throws(() => placedMap(item), /supported Mercator range/)
    assert.throws(() => renderedMap(item), /supported Mercator range/)
  }
})
