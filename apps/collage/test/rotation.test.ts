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
