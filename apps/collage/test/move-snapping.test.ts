import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Point } from '@allmaps/types'
import {
  createMoveSnapper,
  defaultSnapSettings,
  parseSnapSettings
} from '../src/lib/move-snapping.ts'

const defaults = defaultSnapSettings()
const points: Point[] = [
  [-63, -77],
  [137, 123]
]
const anchor: Point = [37, 23]
const close = (actual: Point, expected: Point) =>
  actual.forEach((value, i) =>
    assert.ok(Math.abs(value - expected[i]) < 1e-8, `${actual} != ${expected}`)
  )

test('snapping is opt-in, persists units and recovers invalid stored settings', () => {
  assert.deepEqual(defaults, {
    grid: false,
    axes: false,
    rotation: false,
    rotationStep: 15,
    spacing: 100,
    unit: 'm'
  })
  for (const invalid of [null, undefined, 'bad', []])
    assert.deepEqual(parseSnapSettings(invalid), defaults)
  const settings = {
    grid: true,
    axes: true,
    rotation: true,
    rotationStep: 7.5,
    spacing: 0.5,
    unit: 'km'
  }
  assert.deepEqual(
    parseSnapSettings(JSON.parse(JSON.stringify(settings))),
    settings
  )
  for (const spacing of [0, -1, NaN, Infinity, 1e9, 0.00001, '100'])
    assert.equal(parseSnapSettings({ spacing }).spacing, 100)
  for (const unit of ['unknown', '__proto__', 'toString', ['km'], { m: 1 }])
    assert.equal(parseSnapSettings({ unit }).unit, 'm')
  assert.equal(parseSnapSettings({ grid: 'true' }).grid, false)
  assert.equal(parseSnapSettings({ spacing: 1e6, unit: 'km' }).spacing, 100)
  for (const rotationStep of [0, -15, 0.01, 361, NaN, Infinity, '30'])
    assert.equal(parseSnapSettings({ rotationStep }).rotationStep, 15)
  assert.deepEqual(
    parseSnapSettings({ grid: true, spacing: 0.5, unit: 'km' }),
    { ...defaults, grid: true, spacing: 0.5, unit: 'km' }
  )
  assert.equal(parseSnapSettings({ rotation: 'true' }).rotation, false)
})

test('disabled snapping preserves even subpixel movements exactly', () => {
  const snap = createMoveSnapper(points, defaults, 10)
  for (const delta of [
    [0, 0],
    [1, 2],
    [-123.456, 789.123]
  ] as Point[])
    assert.deepEqual(snap(delta), delta)
})

test('grid aligns the bounds center, including negative coordinates and unit conversion', () => {
  for (const [unit, spacing] of [
    ['m', 100],
    ['km', 0.1]
  ] as const) {
    const snap = createMoveSnapper(
      points,
      { ...defaults, grid: true, unit, spacing },
      1
    )
    close(snap([100, 200]), [63, 177])
    close(snap([-200, -200]), [-237, -223])
  }
  const feet = createMoveSnapper(
    points,
    { ...defaults, grid: true, unit: 'ft' },
    1
  )
  close(feet([100, 200]), [121.92 - 37, 213.36 - 23])
})

test('clicking or returning to an off-grid start does not move a map', () => {
  for (const metersPerPixel of [0.1, 1, 100]) {
    const snap = createMoveSnapper(
      points,
      { ...defaults, grid: true, axes: true },
      metersPerPixel
    )
    close(snap([0, 0]), [0, 0])
    close(snap([metersPerPixel, metersPerPixel]), [0, 0])
    snap([1000 * metersPerPixel, 10 * metersPerPixel])
    close(snap([0, 0]), [0, 0])
  }
})

test('axes attract nearby horizontal and vertical drags but release diagonal movement', () => {
  const snap = createMoveSnapper(points, { ...defaults, axes: true }, 1)
  close(snap([100, 7]), [100, 0])
  close(snap([100, 10]), [100, 0]) // Hysteresis avoids flickering at the edge.
  close(snap([100, 13]), [100, 13])
  close(snap([100, 9]), [100, 9]) // Re-entry uses the narrower tolerance.
  close(snap([100, 7]), [100, 0])
  close(snap([5, -100]), [0, -100])
  close(snap([-100, -7]), [-100, 0])
  close(snap([-100, -100]), [-100, -100])
  close(snap([4, 4]), [0, 0]) // Both axes meet at the drag origin.
})

test('axis guides retain the starting center and report attraction, hysteresis and release', () => {
  const snap = createMoveSnapper(points, { ...defaults, axes: true }, 1)
  assert.deepEqual(snap.guide, { origin: anchor })
  for (const [delta, axis] of [
    [[100, 7], 0],
    [[100, 10], 0],
    [[100, 13], undefined],
    [[5, -100], 1],
    [[0, 0], 'both']
  ] as const) {
    snap([...delta])
    assert.equal(snap.guide?.axis, axis)
    assert.deepEqual(snap.guide?.origin, anchor)
  }
  for (const grid of [false, true]) {
    const other = createMoveSnapper(points, { ...defaults, grid }, 1)
    assert.equal(other.guide, undefined)
    other([100, 7])
    assert.equal(other.guide, undefined)
  }
  const combined = createMoveSnapper(
    points,
    { ...defaults, grid: true, axes: true },
    1
  )
  close(combined([100, 5]), [63, 0])
  assert.deepEqual(combined.guide, { origin: anchor, axis: 0 })
})

test('axis tolerance stays consistent in screen pixels at different zooms', () => {
  for (const metersPerPixel of [0.1, 1, 100]) {
    const snap = createMoveSnapper(
      points,
      { ...defaults, axes: true },
      metersPerPixel
    )
    close(snap([100 * metersPerPixel, 7 * metersPerPixel]), [
      100 * metersPerPixel,
      0
    ])
    close(snap([100 * metersPerPixel, 15 * metersPerPixel]), [
      100 * metersPerPixel,
      15 * metersPerPixel
    ])
  }
})

test('returning near the origin snaps both axes with hysteresis, even off-grid', () => {
  for (const metersPerPixel of [0.1, 1, 100]) {
    for (const grid of [false, true]) {
      const snap = createMoveSnapper(
        points,
        { ...defaults, axes: true, grid },
        metersPerPixel
      )
      const move = (x: number, y: number) =>
        snap([x * metersPerPixel, y * metersPerPixel])
      move(100, 5)
      assert.equal(snap.guide?.axis, 0)
      close(move(6, -5), [0, 0]) // Enter within eight screen pixels.
      assert.deepEqual(snap.guide, { origin: anchor, axis: 'both' })
      close(move(-8, 8), [0, 0]) // Stay snapped within twelve pixels.
      assert.equal(snap.guide?.axis, 'both')
      move(-10, 10)
      assert.equal(snap.guide?.axis, undefined)
      move(7, 7) // Re-entry needs the narrower radius.
      assert.equal(snap.guide?.axis, undefined)
      close(move(-5, 6), [0, 0])
      assert.equal(snap.guide?.axis, 'both')
      move(20, 0) // Release directly onto a single axis.
      assert.equal(snap.guide?.axis, 0)
      close(move(0, 0), [0, 0])
      assert.equal(snap.guide?.axis, 'both')
    }
  }
})

test('combined grid and axes keep the fixed coordinate of an off-grid start', () => {
  const snap = createMoveSnapper(
    points,
    { ...defaults, grid: true, axes: true },
    1
  )
  close(snap([100, 5]), [63, 0])
  close(snap([5, 100]), [0, 77])
  close(snap([100, 100]), [63, 77])
})

test('one snapped translation retains relative positions throughout a selection', () => {
  const snap = createMoveSnapper(points, { ...defaults, grid: true }, 1)
  const delta = snap([100, 200])
  const moved = points.map(
    (p) => p.map((value, i) => value + delta[i]) as Point
  )
  close([moved[1][0] - moved[0][0], moved[1][1] - moved[0][1]], [200, 200])
  close([anchor[0] + delta[0], anchor[1] + delta[1]], [100, 200])
  // The original bounds, rather than last frame's placement, drive every frame.
  close(snap([100, 200]), delta)
  close(snap([120, 220]), [163, 177])
})
