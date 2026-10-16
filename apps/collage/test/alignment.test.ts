import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import { alignMaps, distributeMaps } from '../src/lib/alignment.ts'
import type { Alignment, Distribution } from '../src/lib/alignment.ts'
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

function fixture(count = 3) {
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
  const items = openCollage(
    generateAnnotation(Array.from({ length: count }, () => source))
  )
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

for (const direction of ['horizontal', 'vertical'] as Distribution[]) {
  const axis = direction === 'horizontal' ? 0 : 1
  test(`${direction} distribution equalizes visible gaps, preserving outer maps and layer order`, () => {
    const items = fixture(5)
    items[0].appearance.applyMask = false
    items[4].placement.position[axis] += 7000
    // Layer order need not match spatial order.
    items.reverse()
    const before = structuredClone(items)
    const ordered = [...items].sort(
      (a, b) => a.placement.position[axis] - b.placement.position[axis]
    )
    assert.equal(distributeMaps(items, direction), true)
    const boxes = ordered.map((item) => bounds(outline(item)))
    const gap = boxes[1][axis] - boxes[0][axis + 2]
    for (let i = 2; i < boxes.length; i++)
      close(boxes[i][axis] - boxes[i - 1][axis + 2], gap)
    assert.deepEqual(items[0], before[0])
    assert.deepEqual(items[4], before[4])
    items.forEach((item, i) => {
      close(
        item.placement.position[1 - axis],
        before[i].placement.position[1 - axis]
      )
      assert.equal(item.placement.rotation, before[i].placement.rotation)
      assert.deepEqual({ ...item, placement: before[i].placement }, before[i])
    })
    const distributed = structuredClone(items)
    assert.equal(distributeMaps(items, direction), false)
    assert.deepEqual(items, distributed, 'Repeat does not create an undo step')
  })
}

test('distribution keeps groups rigid and counts them as single objects', () => {
  const items = fixture(6)
  items[0].groupId = items[1].groupId = 'first'
  items[2].groupId = items[3].groupId = 'second'
  items[5].placement.position[0] += 7000
  const before = structuredClone(items)
  assert.equal(distributeMaps(items, 'horizontal'), true)
  const boxes = [
    items.slice(0, 2),
    items.slice(2, 4),
    [items[4]],
    [items[5]]
  ].map((members) => bounds(members.flatMap(outline)))
  const gap = boxes[1][0] - boxes[0][2]
  for (let i = 2; i < boxes.length; i++)
    close(boxes[i][0] - boxes[i - 1][2], gap)
  close(
    items[2].placement.position[0] - before[2].placement.position[0],
    items[3].placement.position[0] - before[3].placement.position[0]
  )
  const distributed = structuredClone(items)
  assert.equal(distributeMaps(items.slice(0, 4), 'horizontal'), false)
  assert.deepEqual(items, distributed, 'Two groups cannot be distributed')
})

test('group editing distributes individual members without changing outsiders', () => {
  const items = fixture(4)
  items.slice(0, 3).forEach((item) => (item.groupId = 'atlas'))
  items[2].placement.position[1] += 2000
  items[3].locked = true
  const outsider = structuredClone(items[3])
  assert.equal(distributeMaps(items, 'vertical', 'atlas'), true)
  const boxes = items.slice(0, 3).map((item) => bounds(outline(item)))
  close(boxes[1][1] - boxes[0][3], boxes[2][1] - boxes[1][3])
  assert.deepEqual(items[3], outsider)
  assert.ok(items.slice(0, 3).every((item) => item.groupId === 'atlas'))
})

test('empty, one, two and locked selections cannot distribute', () => {
  const items = fixture()
  for (let count = 0; count < 3; count++)
    assert.equal(distributeMaps(items.slice(0, count), 'horizontal'), false)
  items[1].locked = true
  const before = structuredClone(items)
  assert.equal(distributeMaps(items, 'horizontal'), false)
  assert.deepEqual(items, before)
})

test('crowded selections equalize overlap without moving the outer objects', () => {
  const items = fixture()
  items.forEach((item, i) => {
    item.placement = { position: [[0, 5, 20][i], 0], rotation: 0 }
    item.localMask = [
      [-50, -50],
      [50, -50],
      [50, 50],
      [-50, 50]
    ]
  })
  assert.equal(distributeMaps(items, 'horizontal'), true)
  assert.deepEqual(
    items.map((item) => item.placement.position[0]),
    [0, 10, 20]
  )
  assert.equal(distributeMaps(items, 'horizontal'), false)
})

test('an unsupported placement rejects distribution before mutating any map', () => {
  const items = fixture()
  const square: Point[] = [
    [-100, -100],
    [100, -100],
    [100, 100],
    [-100, 100]
  ]
  items.forEach((item, i) => {
    item.placement = {
      position: [MAX_COLLAGE_COORDINATE - [800, 600, 100][i], 0],
      rotation: 0
    }
    item.localGcps = square.slice(0, item.baseline.gcps.length)
    item.localMask = square
  })
  items[1].localGcps = items[1].localGcps.map(([x, y]) => [x * 5, y])
  items[1].localMask = square.map(([x, y]) => [x / 10, y / 10])
  items.forEach(placedMap)
  const before = structuredClone(items)
  assert.throws(
    () => distributeMaps(items, 'horizontal'),
    /supported Mercator range/
  )
  assert.deepEqual(items, before)
})

for (const direction of [
  'space-horizontal',
  'space-vertical'
] as Distribution[]) {
  const axis = direction.endsWith('horizontal') ? 0 : 1
  test(`${direction} adds positive gaps for two or more maps while keeping the selection centered`, () => {
    for (const count of [2, 4]) {
      const items = fixture(4).slice(0, count)
      items.forEach((item) => (item.placement.position[axis] = 1000))
      items[0].appearance.applyMask = false
      const before = structuredClone(items)
      const original = bounds(items.flatMap(outline))
      const widths = items.map((item) => {
        const box = bounds(outline(item))
        return box[axis + 2] - box[axis]
      })
      const gap = (widths.reduce((sum, width) => sum + width, 0) / count) * 0.1
      assert.equal(distributeMaps(items, direction), true)
      const boxes = items
        .map((item) => bounds(outline(item)))
        .sort((a, b) => a[axis] - b[axis])
      for (let i = 1; i < count; i++)
        close(boxes[i][axis] - boxes[i - 1][axis + 2], gap)
      const result = bounds(items.flatMap(outline))
      close(
        result[axis] + result[axis + 2],
        original[axis] + original[axis + 2]
      )
      items.forEach((item, i) => {
        close(
          item.placement.position[1 - axis],
          before[i].placement.position[1 - axis]
        )
        assert.equal(item.placement.rotation, before[i].placement.rotation)
        assert.deepEqual({ ...item, placement: before[i].placement }, before[i])
      })
      const spaced = structuredClone(items)
      assert.equal(distributeMaps(items, direction), false)
      assert.deepEqual(items, spaced)
    }
  })
}

test('automatic spacing moves groups rigidly, skips locked maps and needs two objects', () => {
  const items = fixture()
  items[0].groupId = items[1].groupId = 'atlas'
  const before = structuredClone(items)
  assert.equal(distributeMaps(items, 'space-horizontal'), true)
  close(
    items[0].placement.position[0] - before[0].placement.position[0],
    items[1].placement.position[0] - before[1].placement.position[0]
  )
  const a = bounds(items.slice(0, 2).flatMap(outline))
  const b = bounds(outline(items[2]))
  close(b[0] - a[2], ((a[2] - a[0] + b[2] - b[0]) / 2) * 0.1)
  assert.equal(distributeMaps([], 'space-horizontal'), false)
  assert.equal(distributeMaps(items.slice(0, 2), 'space-horizontal'), false)
  items[0].locked = true
  const locked = structuredClone(items)
  assert.equal(distributeMaps(items, 'space-vertical'), false)
  assert.deepEqual(items, locked)
})

test('automatic spacing rejects an out-of-range expansion atomically', () => {
  const items = fixture()
  items.forEach((item) => {
    item.placement = {
      position: [MAX_COLLAGE_COORDINATE - 100, 0],
      rotation: 0
    }
    item.localMask = [
      [-100, -100],
      [100, -100],
      [100, 100],
      [-100, 100]
    ]
    item.localGcps = item.localMask.slice(0, item.baseline.gcps.length)
  })
  items.forEach(placedMap)
  const before = structuredClone(items)
  assert.throws(
    () => distributeMaps(items, 'space-horizontal'),
    /supported Mercator range/
  )
  assert.deepEqual(items, before)
})
