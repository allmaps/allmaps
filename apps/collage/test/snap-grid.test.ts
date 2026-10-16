import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Point } from '@allmaps/types'
import { snapGrid } from '../src/lib/snap-grid.ts'
import {
  createMoveSnapper,
  defaultSnapSettings
} from '../src/lib/move-snapping.ts'
import { CANVAS_SCALE } from '../src/lib/coordinates.ts'
import { projectedToScreen } from '../src/lib/export-view.ts'
import type { ExportView } from '../src/lib/export-view.ts'

const view: ExportView = {
  width: 800,
  height: 600,
  center: [1234 * CANVAS_SCALE, -2345 * CANVAS_SCALE],
  metersPerPixel: 2,
  bearing: 0
}
const vertical = (path: string) =>
  [...path.matchAll(/M([\d.-]+) 0V/g)].map((match) => Number(match[1]))
const horizontal = (path: string) =>
  [...path.matchAll(/M0 ([\d.-]+)H/g)].map((match) => Number(match[1]))
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 0.001, `${a} != ${b}`)

test('backdrop intersections match snapped selection centers through pan and zoom', () => {
  const points: Point[] = [
    [1134, -2445],
    [1334, -2245]
  ]
  const snap = createMoveSnapper(
    points,
    { ...defaultSnapSettings(), grid: true },
    2
  )
  const delta = snap([80, 55])
  const snapped: Point = [
    (1234 + delta[0]) * CANVAS_SCALE,
    (-2345 + delta[1]) * CANVAS_SCALE
  ]
  for (const camera of [
    view,
    { ...view, center: [1284 * CANVAS_SCALE, -2365 * CANVAS_SCALE] as Point },
    { ...view, metersPerPixel: 1 }
  ]) {
    const grid = snapGrid(100, camera)!
    const screen = projectedToScreen(snapped, camera)
    assert.ok(vertical(grid.minor).some((x) => Math.abs(x - screen[0]) < 0.001))
    assert.ok(
      horizontal(grid.minor).some((y) => Math.abs(y - screen[1]) < 0.001)
    )
    const xs = vertical(grid.minor)
    close(xs[1] - xs[0], 100 / camera.metersPerPixel)
    const major = vertical(grid.major)
    close(major[1] - major[0], 500 / camera.metersPerPixel)
  }
})

test('distant grids stay bounded and show only actual snap positions', () => {
  const camera = { ...view, metersPerPixel: 1000 }
  const grid = snapGrid(10, camera)!
  const xs = vertical(grid.minor)
  assert.ok(xs.length > 2 && xs.length <= view.width / 8 + 1)
  close(((xs[1] - xs[0]) * camera.metersPerPixel) / 10, 3125)
  const origin = projectedToScreen([0, 0], camera)
  // SVG coordinates are rounded to 0.001 px; convert that precision to metres.
  for (const x of xs) {
    const index = ((x - origin[0]) * camera.metersPerPixel) / 10
    assert.ok(Math.abs(index - Math.round(index)) <= 0.05)
  }
})

test('very large cells draw only visible lines and empty views draw nothing', () => {
  const camera = { ...view, center: [0, 0] as Point, metersPerPixel: 0.00001 }
  const grid = snapGrid(100_000_000, camera)!
  assert.deepEqual(vertical(grid.minor), [400])
  assert.deepEqual(horizontal(grid.minor), [300])
  assert.equal(grid.minor, grid.major)
  for (const spacing of [0, -1, Infinity, NaN])
    assert.equal(snapGrid(spacing, view), undefined)
  assert.equal(snapGrid(100, { ...view, width: 0 }), undefined)
  assert.equal(snapGrid(100, { ...view, height: Infinity }), undefined)
})
