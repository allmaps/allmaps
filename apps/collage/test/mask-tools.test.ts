import assert from 'node:assert/strict'
import { test } from 'node:test'
import { simplifyMaskStroke } from '../src/lib/freehand-mask.ts'
import {
  drawMaskCircle,
  drawMaskRectangle,
  moveMask,
  maskContains
} from '../src/lib/mask-shapes.ts'
import { validateResourceMask } from '../src/lib/model.ts'
import { moveMaskPoints } from '../src/lib/mask-geometry.ts'
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

test('moving selected mask points preserves their offsets and leaves other vertices untouched', () => {
  const mask: Point[] = [
    [20, 20],
    [80, 20],
    [80, 80],
    [20, 80]
  ]
  const before = structuredClone(mask)
  assert.deepEqual(moveMaskPoints(mask, [0, 1], [5, 10], 100, 100), [
    [25, 30],
    [85, 30],
    [80, 80],
    [20, 80]
  ])
  assert.deepEqual(moveMaskPoints(mask, [1], [-10, 15], 100, 100), [
    [20, 20],
    [70, 35],
    [80, 80],
    [20, 80]
  ])
  assert.deepEqual(moveMaskPoints(mask, [], [30, 40], 100, 100), mask)
  assert.deepEqual(mask, before)
})

test('point and edge drags stop as a unit at the first image boundary', () => {
  const mask: Point[] = [
    [20, 20],
    [80, 20],
    [80, 80],
    [20, 80]
  ]
  const moved = moveMaskPoints(mask, [0, 1], [40, -20], 100, 100)
  assert.deepEqual(moved, [
    [40, 10],
    [100, 10],
    [80, 80],
    [20, 80]
  ])
  // The closing edge moves both the final and first point, without inserting one.
  const closing = moveMaskPoints(mask, [3, 0], [-40, 20], 100, 100)
  assert.deepEqual(closing, [
    [0, 30],
    [80, 20],
    [80, 80],
    [0, 90]
  ])
  assert.equal(closing.length, mask.length)
  validateResourceMask(moved, 100, 100)
  validateResourceMask(closing, 100, 100)
  assert.throws(
    () =>
      validateResourceMask(
        moveMaskPoints(mask, [0], [75, 55], 100, 100),
        100,
        100
      ),
    'Crossing other mask edges must be rejected before committing a draft'
  )
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

test('circle drawing keeps a round shape inside the image when dragging beyond its boundary', () => {
  const circle = drawMaskCircle([100, 200], [900, 900], 500, 400)
  assert.equal(circle.length, 128)
  circle.forEach(([x, y]) =>
    assert.ok(Math.abs(Math.hypot(x - 100, y - 200) - 100) < 1e-8)
  )
  validateResourceMask(circle, 500, 400)
})

test('rectangle drawing supports all drag directions and clamps to the image', () => {
  for (const end of [
    [600, 450],
    [-40, -50],
    [600, -40],
    [-20, 450]
  ] as Point[]) {
    const rectangle = drawMaskRectangle([250, 200], end, 500, 400, (p) => p)
    assert.equal(rectangle.length, 4)
    rectangle.forEach((_, i) => closeToZero(dot(rectangle, i)))
    validateResourceMask(rectangle, 500, 400)
  }
})
test('rectangles stay aligned with the view on rotated and mirrored images, including at image edges', () => {
  for (const mirror of [1, -1]) {
    const angle = Math.PI / 5
    const c = Math.cos(angle),
      s = Math.sin(angle)
    const toResource = ([x, y]: Point): Point => [
      250 + mirror * (c * x - s * y),
      200 + s * x + c * y
    ]
    const toView = ([x, y]: Point): Point => [
      c * mirror * (x - 250) + s * (y - 200),
      -s * mirror * (x - 250) + c * (y - 200)
    ]
    for (const end of [
      [80, 60],
      [800, 600],
      [-800, 600],
      [800, -600],
      [-800, -600]
    ] as Point[]) {
      const rectangle = drawMaskRectangle([0, 0], end, 500, 400, toResource)
      validateResourceMask(rectangle, 500, 400)
      const view = rectangle.map(toView)
      closeToZero(view[0][1] - view[1][1])
      closeToZero(view[1][0] - view[2][0])
      closeToZero(view[2][1] - view[3][1])
      closeToZero(view[3][0] - view[0][0])
      assert.ok(view.some(([x, y]) => Math.hypot(x, y) < 1e-8))
      if (Math.abs(end[0]) === 800)
        assert.ok(
          rectangle.some(([x, y]) => Math.min(x, y, 500 - x, 400 - y) < 1e-8),
          'stops at the first image edge'
        )
      else {
        assert.ok(view.some(([x, y]) => Math.hypot(x - 80, y - 60) < 1e-8))
      }
    }
  }
})

// A view with rotation, unequal axis scales and shear, optionally mirrored.
function skewedView(mirror: number) {
  const a = 1.6 * mirror,
    b = 0.8,
    c = 0.6 * mirror,
    d = 1.2
  const determinant = a * d - b * c
  const toView = ([x, y]: Point): Point => [
    a * (x - 250) + b * (y - 200),
    c * (x - 250) + d * (y - 200)
  ]
  const toResource = ([x, y]: Point): Point => [
    250 + (d * x - b * y) / determinant,
    200 + (a * y - c * x) / determinant
  ]
  return { toView, toResource }
}

for (const mirror of [1, -1]) {
  test(`view circles stay round on skewed maps, including at image edges (mirror ${mirror})`, () => {
    const { toView, toResource } = skewedView(mirror)
    for (const distance of [50, 2000]) {
      const circle = drawMaskCircle([0, 0], [distance, 0], 500, 400, toResource)
      validateResourceMask(circle, 500, 400)
      const view = circle.map(toView)
      const radius = Math.hypot(...view[0])
      view.forEach((point) => closeToZero(Math.hypot(...point) - radius))
      if (distance === 50) closeToZero(radius - distance)
      else {
        assert.ok(radius < distance)
        assert.ok(
          circle.some(([x, y]) => Math.min(x, y, 500 - x, 400 - y) < 1e-8)
        )
      }
      // Opposite vertices retain the chosen screen center after constraining.
      for (let i = 0; i < 64; i++) {
        closeToZero(view[i][0] + view[i + 64][0])
        closeToZero(view[i][1] + view[i + 64][1])
      }
    }
  })

  test(`view rectangles keep right angles and screen axes despite shear (mirror ${mirror})`, () => {
    const { toView, toResource } = skewedView(mirror)
    for (const end of [
      [60, 40],
      [800, 600],
      [-800, 600],
      [800, -600],
      [-800, -600]
    ] as Point[]) {
      const rectangle = drawMaskRectangle([0, 0], end, 500, 400, toResource)
      validateResourceMask(rectangle, 500, 400)
      const view = rectangle.map(toView)
      view.forEach((_, i) => closeToZero(dot(view, i)))
      closeToZero(view[0][1] - view[1][1])
      closeToZero(view[1][0] - view[2][0])
      assert.ok(view.some(([x, y]) => Math.hypot(x, y) < 1e-8))
    }
  })

  test(`map shapes follow the original image axes and distort with the map (mirror ${mirror})`, () => {
    const { toView } = skewedView(mirror)
    const circle = drawMaskCircle([250, 200], [300, 200], 500, 400)
    circle.forEach(([x, y]) => closeToZero(Math.hypot(x - 250, y - 200) - 50))
    const radii = circle.map((p) => Math.hypot(...toView(p)))
    assert.ok(
      Math.max(...radii) > Math.min(...radii) * 2,
      'circle renders as an ellipse'
    )
    const rectangle = drawMaskRectangle([250, 200], [350, 280], 500, 400)
    assert.deepEqual(rectangle, [
      [250, 200],
      [350, 200],
      [350, 280],
      [250, 280]
    ])
    const view = rectangle.map(toView)
    assert.ok(
      Math.abs(dot(view, 0)) > 0.5,
      'rectangle renders as a skewed parallelogram'
    )
    const [origin, x, , y] = view
    const imageOrigin = toView([0, 0]),
      imageX = toView([100, 0]),
      imageY = toView([0, 80])
    for (const axis of [0, 1]) {
      closeToZero(x[axis] - origin[axis] - (imageX[axis] - imageOrigin[axis]))
      closeToZero(y[axis] - origin[axis] - (imageY[axis] - imageOrigin[axis]))
    }
  })
}

function closeToZero(n: number) {
  assert.ok(Math.abs(n) < 1e-8)
}

test('moving a mask is rigid, clamps at image bounds and does not mutate its starting shape', () => {
  const mask: Point[] = [
    [10, 30],
    [80, 10],
    [100, 120],
    [20, 140]
  ]
  const before = structuredClone(mask)
  for (const delta of [
    [30, 40],
    [-500, 800],
    [800, -400]
  ] as Point[]) {
    const moved = moveMask(mask, delta, 300, 300)
    const offset = [moved[0][0] - mask[0][0], moved[0][1] - mask[0][1]]
    moved.forEach((p, i) =>
      assert.deepEqual(p, [mask[i][0] + offset[0], mask[i][1] + offset[1]])
    )
    validateResourceMask(moved, 300, 300)
  }
  assert.deepEqual(mask, before)
  assert.equal(maskContains(mask, [50, 60]), true)
  assert.equal(maskContains(mask, [200, 60]), false)
})
