import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { compactLayout, overlaps } from '../src/lib/prism.ts'
import type { LayoutBox } from '../src/lib/prism.ts'
import type { Point } from '@allmaps/types'

const cases: [string, LayoutBox[]][] = [
  ['empty', []],
  ['single', [{ x: 25, y: -45, w: 20, h: 12 }]],
  [
    'coincident',
    Array.from({ length: 20 }, () => ({ x: 0, y: 0, w: 20, h: 20 }))
  ],
  [
    'grid',
    Array.from({ length: 49 }, (_, i) => ({
      x: (i % 7) * 10,
      y: Math.floor(i / 7) * 10,
      w: 12,
      h: 12
    }))
  ],
  [
    'collinear strips',
    Array.from({ length: 15 }, (_, i) => ({ x: i * 4, y: 0, w: 60, h: 1 }))
  ],
  [
    'nested sizes',
    Array.from({ length: 15 }, (_, i) => ({
      x: i,
      y: i * 0.3,
      w: i ? 10 : 300,
      h: i ? 10 : 300
    }))
  ]
]

function gap(boxes: LayoutBox[]) {
  return (
    Math.sqrt(boxes.reduce((sum, b) => sum + b.w * b.h, 0) / boxes.length) * 0.2
  )
}
for (const [name, boxes] of cases)
  test(`compact PRISM: ${name}`, () => {
    const before = structuredClone(boxes)
    const result = compactLayout(boxes)
    assert.deepEqual(boxes, before)
    assert.equal(result.fallback, false)
    assert.equal(result.positions.length, boxes.length)
    assert.ok(result.positions.flat().every(Number.isFinite))
    if (boxes.length)
      assert.deepEqual(result.positions[0], [boxes[0].x, boxes[0].y])
    assert.equal(overlaps(boxes, result.positions, gap(boxes)).length, 0)
    assert.deepEqual(compactLayout(boxes), result)
  })

// Public notebook examples captured by the layout experiment. These fixtures
// contain only bounds and expected centers, with no remote test dependency.
const examples: { id: string; boxes: LayoutBox[]; expected: Point[] }[] =
  JSON.parse(
    readFileSync(
      new URL('./fixtures/layout-examples.json', import.meta.url),
      'utf8'
    )
  )
for (const example of examples)
  test(`optimized ${example.id} layout matches the approved experiment`, () => {
    const result = compactLayout(example.boxes)
    assert.equal(result.fallback, false)
    result.positions.forEach((p, i) =>
      assert.ok(
        Math.hypot(
          p[0] - example.expected[i][0],
          p[1] - example.expected[i][1]
        ) < 1e-6
      )
    )
    assert.equal(
      overlaps(example.boxes, result.positions, gap(example.boxes)).length,
      0
    )
  })

test('numerical units do not affect the arrangement', () => {
  const boxes = cases.find(([name]) => name === 'grid')![1]
  const scaled = boxes.map((b) => ({
    x: b.x * 10000,
    y: b.y * 10000,
    w: b.w * 10000,
    h: b.h * 10000
  }))
  const a = compactLayout(boxes),
    b = compactLayout(scaled)
  a.positions.forEach((p, i) =>
    assert.ok(
      Math.hypot(
        p[0] - b.positions[i][0] / 10000,
        p[1] - b.positions[i][1] / 10000
      ) < 1e-6
    )
  )
})

test('invalid geometry is rejected before running the solver', () => {
  for (const w of [0, -1, NaN, Infinity])
    assert.throws(
      () => compactLayout([{ x: 0, y: 0, w, h: 1 }]),
      /finite, non-empty/
    )
})
