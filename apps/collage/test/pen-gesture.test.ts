import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PenTouchGesture } from '../src/lib/pen-gesture.ts'

const touch = (pointerId: number) => ({ pointerId, pointerType: 'touch' })

for (const releaseOrder of [
  [1, 2],
  [2, 1]
]) {
  test(`pinch suppresses drawing until both fingers lift (${releaseOrder})`, () => {
    const gesture = new PenTouchGesture()
    assert.equal(gesture.start(touch(1)), false)
    assert.equal(gesture.pinching, false)
    assert.equal(gesture.start(touch(2)), true)
    assert.equal(gesture.pinching, true)
    assert.equal(gesture.end(touch(releaseOrder[0])), true)
    assert.equal(gesture.pinching, true)
    assert.equal(gesture.end(touch(releaseOrder[1])), true)
    assert.equal(gesture.pinching, false)
    assert.equal(gesture.start(touch(3)), false)
    assert.equal(gesture.end(touch(3)), false)
  })
}

test('extra fingers and cancellation remain part of the same pinch', () => {
  const gesture = new PenTouchGesture()
  gesture.start(touch(1))
  assert.equal(gesture.start(touch(2)), true)
  assert.equal(gesture.start(touch(3)), false)
  gesture.end(touch(1))
  gesture.end(touch(2))
  assert.equal(gesture.pinching, true)
  gesture.end(touch(3))
  assert.equal(gesture.pinching, false)
})

test('mouse and stylus strokes do not start a pinch; leaving pen mode clears touches', () => {
  const gesture = new PenTouchGesture()
  assert.equal(gesture.start({ pointerId: 1, pointerType: 'mouse' }), false)
  assert.equal(gesture.start({ pointerId: 2, pointerType: 'pen' }), false)
  assert.equal(gesture.start(touch(3)), false)
  assert.equal(gesture.start(touch(4)), true)
  gesture.reset()
  assert.equal(gesture.start(touch(5)), false)
  assert.equal(gesture.pinching, false)
})
