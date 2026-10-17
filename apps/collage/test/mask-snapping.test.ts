import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Point } from '@allmaps/types'
import { createMaskSnapper } from '../src/lib/mask-snapping.ts'
import { moveMaskPoints } from '../src/lib/mask-geometry.ts'

const mask: Point[] = [
  [20, 20],
  [80, 20],
  [80, 80],
  [20, 80]
]
const identity = (point: Point) => point
const close = (a: Point, b: Point) =>
  a.forEach((value, index) =>
    assert.ok(Math.abs(value - b[index]) < 1e-8, `${a} != ${b}`)
  )

test('a point follows either connected edge extension, with free movement between them', () => {
  const snap = createMaskSnapper(mask, [0], identity)
  close(snap([32, 6]), [32, 0])
  assert.equal(snap.guides.filter(({ active }) => active).length, 1)
  close(snap([-5, 40]), [0, 40])
  close(snap([30, 30]), [30, 30])
  assert.ok(snap.guides.every(({ active }) => !active))
})

test('edge translation follows its connected edges, not the edge being moved', () => {
  const snap = createMaskSnapper(mask, [0, 1], identity)
  close(snap([7, 25]), [0, 25])
  assert.equal(snap.guides.length, 2)
  assert.ok(snap.guides.every(({ active }) => active))
  assert.deepEqual(moveMaskPoints(mask, [0, 1], snap([7, 25]), 100, 100), [
    [20, 45],
    [80, 45],
    [80, 80],
    [20, 80]
  ])
  close(snap([40, 4]), [40, 4])
  const closing = createMaskSnapper(mask, [3, 0], identity)
  close(closing([25, 7]), [25, 0])
})

test('returning to the start is exact and highlights every connected extension', () => {
  for (const indices of [[0], [0, 1], [0, 2], [0, 1, 2, 3]]) {
    const snap = createMaskSnapper(mask, indices, identity)
    snap([40, 30])
    close(snap([4, 5]), [0, 0])
    assert.equal(snap.origin, true)
    assert.ok(snap.guides.every(({ active }) => active))
    close(snap([8, 8]), [0, 0])
    close(snap([10, 10]), [10, 10])
    assert.equal(snap.origin, false)
  }
})

test('guide attraction has hysteresis and releases when moved away', () => {
  const snap = createMaskSnapper(mask, [0], identity)
  close(snap([40, 7]), [40, 0])
  close(snap([40, 11]), [40, 0])
  close(snap([40, 13]), [40, 13])
  close(snap([40, 9]), [40, 9])
  close(snap([40, 7]), [40, 0])
})

test('screen-space tolerance follows zoom changes, rotation, skew and mirroring', () => {
  let zoom = 1
  const snap = createMaskSnapper(mask, [0], ([x, y]) => [zoom * x, zoom * y])
  close(snap([40, 6]), [40, 0])
  zoom = 4
  close(snap([40, 6]), [40, 6])
  close(snap([40, 1]), [40, 0])
  for (const mirror of [1, -1]) {
    const project = ([x, y]: Point): Point => [
      mirror * (2 * x + y),
      -0.3 * x + 1.5 * y
    ]
    const skewed = createMaskSnapper(mask, [0, 1], project)
    close(skewed([1, 30]), [0, 30 + 1.55 / 3.25])
    assert.ok(skewed.guides.every(({ active }) => active))
    close(skewed([25, 25]), [25, 25])
  }
})

test('disconnected selected points translate together and whole-mask selection only snaps home', () => {
  const snap = createMaskSnapper(mask, [0, 2], identity)
  close(snap([30, 4]), [30, 0])
  const all = createMaskSnapper(mask, [0, 1, 2, 3], identity)
  close(all([30, 4]), [30, 4])
  assert.deepEqual(all.guides, [])
  close(all([4, 4]), [0, 0])
  assert.equal(all.origin, true)
  assert.deepEqual(mask, [
    [20, 20],
    [80, 20],
    [80, 80],
    [20, 80]
  ])
})
