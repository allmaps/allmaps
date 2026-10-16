import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nearestRotation, snapRotation } from '../src/lib/rotation.ts'

const radians = Math.PI / 180
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-10, `${a} ≠ ${b}`)

test('rotation snaps within four degrees of the natural bearing and releases outside it', () => {
  const target = 23 * radians
  for (const offset of [-3.9, -1, 0, 1, 3.9])
    close(snapRotation(target + offset * radians, target), target)
  for (const offset of [-4.1, 4.1, 60])
    close(
      snapRotation(target + offset * radians, target),
      target + offset * radians
    )
})

test('snapping crosses the angle boundary without jumping or losing accumulated turns', () => {
  close(snapRotation(181 * radians, -178 * radians), 182 * radians)
  close(snapRotation(-181 * radians, 178 * radians), -182 * radians)
  close(snapRotation(743 * radians, 25 * radians), 745 * radians)
  close(nearestRotation(-743 * radians, -25 * radians), -745 * radians)
})

test('natural bearing wins over Shift steps nearby; the 15-degree grid applies elsewhere', () => {
  close(snapRotation(21 * radians, 23 * radians, true), 23 * radians)
  close(snapRotation(8 * radians, 23 * radians, true), 15 * radians)
  close(snapRotation(-8 * radians, 23 * radians, true), -15 * radians)
})

test('configured angle steps override bearing attraction and the temporary Shift grid', () => {
  for (const shift of [false, true]) {
    close(snapRotation(21 * radians, 23 * radians, shift, 30), 30 * radians)
    close(snapRotation(-21 * radians, 23 * radians, shift, 30), -30 * radians)
    close(snapRotation(20 * radians, 23 * radians, shift, 7.5), 22.5 * radians)
    close(snapRotation(23.04 * radians, 23 * radians, shift, 0.1), 23 * radians)
    close(
      snapRotation(23.06 * radians, 23 * radians, shift, 0.1),
      23.1 * radians
    )
  }
})

test('custom steps preserve accumulated turns and include zero for uneven angle divisions', () => {
  for (const [angle, step, expected] of [
    [181, 45, 180],
    [743, 30, 750],
    [-743, 30, -750],
    [340, 100, 360],
    [-20, 100, 0],
    [-80, 100, -60],
    [380, 100, 360],
    [665, 100, 660],
    [359, 360, 360]
  ])
    close(snapRotation(angle * radians, 0, false, step), expected * radians)
})
