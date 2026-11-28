import assert from 'node:assert/strict'
import test from 'node:test'
import { dragOpacity } from '../src/lib/components/ui/opacity-slider/drag-opacity.ts'

const track = { top: 100, bottom: 200 }

test('a hold stays a peek until the pointer reaches the positioned track', () => {
  for (const [start, away, gap] of [
    [220, 240, 205],
    [80, 60, 95]
  ]) {
    for (const y of [start, away, gap]) {
      assert.equal(dragOpacity(start, y, track, false), undefined)
    }
    assert.equal(dragOpacity(start, 150, track, false), 0.5)
  }
})

test('a fast drag can cross the track and an active drag clamps at either end', () => {
  assert.equal(dragOpacity(220, 90, track, false), 1)
  assert.equal(dragOpacity(80, 210, track, false), 0)
  assert.equal(dragOpacity(220, 220, track, true), 0)
  assert.equal(dragOpacity(80, 80, track, true), 1)
})
