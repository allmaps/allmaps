import { maskEdgeAt } from '../src/lib/mask-geometry.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bounds,
  clipPolygon,
  packBoxes,
  visibleCenter
} from '../src/lib/geometry.ts'
import type { Point } from '@allmaps/types'

test('visible center follows the clipped mask, including a map covering the whole screen', () => {
  const viewport: [number, number, number, number] = [0, 0, 800, 600]
  const huge: Point[] = [
    [-200, -300],
    [1500, -300],
    [1500, 1600],
    [-200, 1600]
  ]
  assert.deepEqual(visibleCenter([huge], viewport), [400, 300])
  const partial: Point[] = [
    [600, 100],
    [1200, 100],
    [1200, 500],
    [600, 500]
  ]
  assert.deepEqual(visibleCenter([partial], viewport), [700, 300])
  const outside: Point[] = [
    [900, 100],
    [1200, 100],
    [1200, 500],
    [900, 500]
  ]
  assert.equal(visibleCenter([outside], viewport), undefined)
})

test('marquee intersection includes enclosing maps and rejects empty corners of a rotated mask', () => {
  const diamond: Point[] = [
    [100, 0],
    [200, 100],
    [100, 200],
    [0, 100]
  ]
  assert.equal(clipPolygon(diamond, [0, 0, 20, 20]).length, 0)
  assert.equal(clipPolygon(diamond, [90, 90, 110, 110]).length, 4)
  assert.deepEqual(clipPolygon(diamond, [-10, -10, 210, 210]), diamond)
})

test('spiral packing leaves padding, keeps dimensions and order, and centers a compact batch', () => {
  const sizes: Point[] = [
    [80, 100],
    [500, 300],
    [140, 800],
    [10, 10],
    [240, 320],
    [700, 450]
  ]
  const original = structuredClone(sizes)
  const positions = packBoxes(sizes, 1.6)
  assert.deepEqual(sizes, original)
  const rectangles = positions.map(([x, y], i) => [
    x - sizes[i][0] / 2,
    y - sizes[i][1] / 2,
    x + sizes[i][0] / 2,
    y + sizes[i][1] / 2
  ])
  for (let i = 0; i < rectangles.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = rectangles[i],
        b = rectangles[j]
      assert.ok(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1])
    }
  }
  const [left, bottom, right, top] = bounds(
    rectangles.flatMap((r): Point[] => [
      [r[0], r[1]],
      [r[2], r[3]]
    ])
  )
  assert.ok(Math.abs(left + right) < 1e-8)
  assert.ok(Math.abs(bottom + top) < 1e-8)
  const squareBatch = packBoxes(
    Array.from({ length: 12 }, (): Point => [100, 100]),
    1
  )
  const squareExtent = bounds(squareBatch)
  assert.ok(squareExtent[2] - squareExtent[0] < 800)
  assert.ok(squareExtent[3] - squareExtent[1] < 800)
  assert.deepEqual(packBoxes([]), [])
  assert.deepEqual(packBoxes([[30, 500]]), [[0, 0]])
})

test('mask edge dragging hits arbitrary edge positions while giving existing vertices priority', () => {
  const ring: Point[] = [
    [0, 0],
    [200, 0],
    [200, 200],
    [0, 200]
  ]
  const edge = maskEdgeAt(ring, [45, 5])!
  assert.equal(edge.index, 0)
  assert.deepEqual(edge.position, [45, 0])
  assert.equal(edge.fraction, 0.225)
  assert.equal(maskEdgeAt(ring, [5, 5]), undefined)
  assert.equal(maskEdgeAt(ring, [100, 100]), undefined)
  assert.equal(maskEdgeAt(ring, [-4, 70])?.index, 3)
})
