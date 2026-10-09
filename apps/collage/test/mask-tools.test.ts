import assert from 'node:assert/strict'
import { test } from 'node:test'
import { orthogonalizeMask } from '../src/lib/orthogonalize.ts'
import { simplifyMaskStroke } from '../src/lib/freehand-mask.ts'
import { validateResourceMask } from '../src/lib/model.ts'
import type { Point } from '@allmaps/types'

function dot(points: Point[], i: number) {
  const p = points[i],
    a = points[(i + points.length - 1) % points.length],
    b = points[(i + 1) % points.length]
  return (
    ((a[0] - p[0]) * (b[0] - p[0]) + (a[1] - p[1]) * (b[1] - p[1])) /
    (Math.hypot(a[0] - p[0], a[1] - p[1]) *
      Math.hypot(b[0] - p[0], b[1] - p[1]))
  )
}

test('orthogonalize straightens a tilted mask and removes redundant straight vertices', () => {
  const mask: Point[] = [
    [200, 150],
    [400, 200],
    [600, 251],
    [545, 505],
    [145, 405]
  ]
  const before = structuredClone(mask)
  const result = orthogonalizeMask(mask, 1000, 1000)
  assert.equal(result.length, 4)
  result.forEach((_, i) => assert.ok(Math.abs(dot(result, i)) < 0.0002))
  assert.ok(result[1][1] - result[0][1] > 80, 'retains tilted orientation')
  assert.deepEqual(mask, before)
  validateResourceMask(result, 1000, 1000)
})

test('orthogonalize preserves deliberate non-square shapes and exact rectangles', () => {
  for (const mask of [
    [
      [100, 100],
      [300, 100],
      [300, 400],
      [100, 400]
    ],
    [
      [200, 100],
      [350, 360],
      [50, 360]
    ]
  ] as Point[][])
    assert.deepEqual(orthogonalizeMask(mask, 500, 500), mask)
})

test('orthogonalize keeps boundary-adjacent masks inside the image and remains idempotent', () => {
  const result = orthogonalizeMask(
    [
      [0, 4],
      [998, 0],
      [1000, 790],
      [8, 800]
    ],
    1000,
    800
  )
  validateResourceMask(result, 1000, 800)
  result.forEach((_, i) => assert.ok(Math.abs(dot(result, i)) < 0.0002))
  const again = orthogonalizeMask(result, 1000, 800)
  result.forEach((p, i) =>
    assert.ok(Math.hypot(p[0] - again[i][0], p[1] - again[i][1]) < 0.05)
  )
})

test('orthogonalize can straighten one corner of a near-right triangle', () => {
  const result = orthogonalizeMask(
    [
      [100, 100],
      [400, 115],
      [100, 400]
    ],
    500,
    500
  )
  assert.ok(
    Math.min(...result.map((_, i) => Math.abs(dot(result, i)))) < 0.0002
  )
  validateResourceMask(result, 500, 500)
})

test('pen strokes become small editable polygons at the current screen resolution', () => {
  const stroke: Point[] = []
  for (let i = 0; i <= 100; i++)
    stroke.push([100 + i * 6, 100 + Math.sin(i) * 0.4])
  for (let i = 1; i <= 100; i++)
    stroke.push([700 + Math.sin(i) * 0.4, 100 + i * 5])
  for (let i = 1; i <= 100; i++)
    stroke.push([700 - i * 6, 600 + Math.sin(i) * 0.4])
  for (let i = 1; i < 100; i++)
    stroke.push([100 + Math.sin(i) * 0.4, 600 - i * 5])
  const before = structuredClone(stroke)
  const result = simplifyMaskStroke(stroke, 800, 700, (p) => p)
  assert.ok(result.length >= 4 && result.length <= 6)
  assert.deepEqual(stroke, before)
  validateResourceMask(result, 800, 700)
})

test('pen handles repeated boundary samples and rejects crossing or empty strokes', () => {
  const result = simplifyMaskStroke(
    [
      [0, 0],
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [0, 0]
    ],
    100,
    100,
    (p) => p
  )
  assert.equal(result.length, 4)
  for (const points of [
    [
      [1, 1],
      [10, 10]
    ],
    [
      [0, 0],
      [100, 100],
      [0, 100],
      [100, 0]
    ]
  ] as Point[][])
    assert.throws(() => simplifyMaskStroke(points, 100, 100, (p) => p))
})
