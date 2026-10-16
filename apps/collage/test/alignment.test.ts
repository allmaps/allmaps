import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import { alignMaps } from '../src/lib/alignment.ts'
import type { Alignment } from '../src/lib/alignment.ts'
import { bounds } from '../src/lib/geometry.ts'
import { MAX_COLLAGE_COORDINATE } from '../src/lib/coordinates.ts'
import {
  openCollage,
  outline,
  mirrorMap,
  setMapTransform,
  setResourceMask,
  placedMap
} from '../src/lib/model.ts'

function fixture() {
  const source: GeoreferencedMap = {
    type: 'GeoreferencedMap',
    resource: {
      id: 'https://example.org/image',
      type: 'ImageService2',
      width: 1000,
      height: 800
    },
    resourceMask: [
      [0, 0],
      [1000, 0],
      [1000, 800],
      [0, 800]
    ],
    gcps: [
      { resource: [0, 0], geo: [0, 0] },
      { resource: [1000, 0], geo: [0.01, 0] },
      { resource: [0, 800], geo: [0, -0.008] }
    ],
    transformation: { type: 'helmert' }
  }
  const items = openCollage(generateAnnotation([source, source, source]))
  items.forEach((item, i) => {
    item.placement = { position: [i * 2000, i * 1200], rotation: i * 0.3 }
    item.appearance.opacity = (i + 1) / 3
  })
  setResourceMask(items[0], [
    [100, 200],
    [800, 150],
    [700, 600],
    [200, 700]
  ])
  mirrorMap(items[1])
  setMapTransform(items[2], {
    scaleX: 1.2,
    scaleY: 0.8,
    skewX: 0.3,
    skewY: -0.2
  })
  return items
}

function close(a: number, b: number) {
  assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
}

const alignments: [Alignment, number, number[]][] = [
  ['top', 1, [3]],
  ['bottom', 1, [1]],
  ['left', 0, [0]],
  ['right', 0, [2]],
  ['horizontal', 0, [0, 2]],
  ['vertical', 1, [1, 3]]
]
for (const [alignment, axis, edges] of alignments) {
  test(`${alignment} aligns visible edges/centers without changing shapes or settings`, () => {
    const items = fixture()
    const before = structuredClone(items)
    const box = bounds(items.flatMap(outline))
    const target = edges.reduce((sum, i) => sum + box[i], 0) / edges.length
    assert.equal(alignMaps(items, alignment), true)
    items.forEach((item, i) => {
      const nextBox = bounds(outline(item))
      close(
        edges.reduce((sum, i) => sum + nextBox[i], 0) / edges.length,
        target
      )
      close(
        item.placement.position[1 - axis],
        before[i].placement.position[1 - axis]
      )
      assert.deepEqual({ ...item, placement: before[i].placement }, before[i])
      assert.equal(item.placement.rotation, before[i].placement.rotation)
      const previousPoints = outline(before[i])
      const offset =
        item.placement.position[axis] - before[i].placement.position[axis]
      outline(item).forEach((point, j) => {
        close(point[axis] - previousPoints[j][axis], offset)
        close(point[1 - axis], previousPoints[j][1 - axis])
      })
    })
    const aligned = structuredClone(items)
    assert.equal(
      alignMaps(items, alignment),
      false,
      'Repeat is a no-op, without an undo step'
    )
    assert.deepEqual(items, aligned)
  })
}

test('disabling a mask aligns the full image instead of the crop', () => {
  const items = fixture()
  items[0].appearance.applyMask = false
  const target = bounds(items.flatMap(outline))[0]
  alignMaps(items, 'left')
  items.forEach((item) => close(bounds(outline(item))[0], target))
  const cropped = {
    ...items[0],
    appearance: { ...items[0].appearance, applyMask: true }
  }
  assert.ok(bounds(outline(cropped))[0] > target)
})

test('groups align rigidly; group editing aligns individual members and leaves outsiders alone', () => {
  const items = fixture()
  items[0].groupId = items[1].groupId = 'atlas'
  const before = structuredClone(items)
  assert.equal(alignMaps(items, 'top'), true)
  const groupBox = bounds(items.slice(0, 2).flatMap(outline))
  close(groupBox[3], bounds(outline(items[2]))[3])
  for (const axis of [0, 1]) {
    close(
      items[0].placement.position[axis] - before[0].placement.position[axis],
      items[1].placement.position[axis] - before[1].placement.position[axis]
    )
  }
  const grouped = structuredClone(items)
  assert.equal(alignMaps(items.slice(0, 2), 'left'), false)
  assert.deepEqual(items, grouped)
  assert.equal(alignMaps(items, 'left', 'atlas'), true)
  close(bounds(outline(items[0]))[0], bounds(outline(items[1]))[0])
  assert.deepEqual(items[2], grouped[2])
  assert.equal(items[0].groupId, 'atlas')
  assert.equal(items[1].groupId, 'atlas')
})

test('empty, single and locked selections cannot align', () => {
  const items = fixture()
  assert.equal(alignMaps([], 'left'), false)
  assert.equal(alignMaps(items.slice(0, 1), 'left'), false)
  items[1].locked = true
  const before = structuredClone(items)
  assert.equal(alignMaps(items, 'left'), false)
  assert.deepEqual(items, before)
})

test('an unsupported placement rejects the entire alignment before mutation', () => {
  const items = fixture()
  const square: Point[] = [
    [-100, -100],
    [100, -100],
    [100, 100],
    [-100, 100]
  ]
  items.forEach((item) => {
    item.placement.rotation = 0
    item.localGcps = square.slice(0, item.baseline.gcps.length)
    item.localMask = square
  })
  items[1].localMask = square.map(([x, y]) => [x / 10, y / 10])
  items[2].placement.position[0] = MAX_COLLAGE_COORDINATE - 100
  items.forEach(placedMap)
  const before = structuredClone(items)
  assert.throws(() => alignMaps(items, 'right'), /supported Mercator range/)
  assert.deepEqual(items, before)
})
