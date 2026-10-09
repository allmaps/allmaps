import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PenTouchGesture } from '../src/lib/pen-gesture.ts'

const touch = (pointerId: number, clientX = 0, clientY = 0) => ({
  pointerId,
  pointerType: 'touch',
  clientX,
  clientY
})

test('second finger pauses a stroke, zooms at the pen, then resumes it', () => {
  const gesture = new PenTouchGesture()
  gesture.start(touch(1, 100, 100), false)
  assert.equal(gesture.start(touch(2, 200, 100), true), 'pinch')
  assert.equal(gesture.pinching, true)
  assert.deepEqual(gesture.move(touch(2, 300, 100)), {
    zoomDelta: 1,
    pan: [0, 0]
  })
  assert.equal(gesture.end(touch(2)), true)
  assert.equal(gesture.pinching, false)
  assert.equal(gesture.navigating, false)
  assert.equal(gesture.hasPointers, true)
  assert.equal(gesture.move(touch(1, 110, 120)), undefined)
  // The drawing pointer, and only that pointer, may finish the same stroke.
  assert.equal(gesture.end(touch(1)), false)
  assert.equal(gesture.hasPointers, false)
})

test('moving both fingers pans with the pen without changing the final scale', () => {
  const gesture = new PenTouchGesture()
  gesture.start(touch(1, 100, 100), false)
  gesture.start(touch(2, 200, 100), true)
  const first = gesture.move(touch(1, 120, 120))!
  const second = gesture.move(touch(2, 220, 120))!
  assert.deepEqual(first.pan, [-20, -20])
  assert.deepEqual(second.pan, [0, 0])
  assert.ok(Math.abs(first.zoomDelta + second.zoomDelta) < 1e-12)
})

test('lifting the drawing finger first finishes once and suppresses remaining fingers', () => {
  const gesture = new PenTouchGesture()
  gesture.start(touch(1), false)
  gesture.start(touch(2, 100), true)
  assert.equal(gesture.end(touch(1)), false)
  assert.equal(gesture.navigating, true)
  assert.equal(gesture.move(touch(2, 150)), undefined)
  assert.equal(gesture.end(touch(2)), true)
  assert.equal(gesture.hasPointers, false)
})

for (const order of [
  [1, 2],
  [2, 1]
]) {
  test(`two fingers before drawing use native navigation until all lift (${order})`, () => {
    const gesture = new PenTouchGesture()
    gesture.start(touch(1), false)
    assert.equal(gesture.start(touch(2, 100), false), 'navigate')
    assert.equal(gesture.pinching, false)
    assert.equal(gesture.navigating, true)
    assert.equal(gesture.move(touch(2, 200)), undefined)
    assert.equal(gesture.end(touch(order[0])), true)
    assert.equal(gesture.navigating, true)
    assert.equal(gesture.end(touch(order[1])), true)
    assert.equal(gesture.navigating, false)
  })
}

test('extra fingers and repeated pinches rebase without camera jumps', () => {
  const gesture = new PenTouchGesture()
  gesture.start(touch(1), false)
  gesture.start(touch(2, 100), true)
  gesture.start(touch(3, 500), true)
  gesture.end(touch(2))
  assert.deepEqual(gesture.move(touch(3, 500)), { zoomDelta: 0, pan: [0, 0] })
  gesture.end(touch(3))
  assert.equal(gesture.pinching, false)
  assert.equal(gesture.start(touch(4, 200), true), 'pinch')
  assert.deepEqual(gesture.move(touch(4, 100)), { zoomDelta: -1, pan: [0, 0] })
})

test('stylus can stay the drawing pointer while a finger zooms', () => {
  const gesture = new PenTouchGesture()
  const pen = { ...touch(1), pointerType: 'pen' }
  gesture.start(pen, false)
  assert.equal(gesture.start(touch(2, 100), true), 'pinch')
  assert.equal(gesture.end(touch(2)), true)
  assert.equal(gesture.end(pen), false)
})

test('reset clears a cancelled gesture and mouse events do not create touches', () => {
  const gesture = new PenTouchGesture()
  assert.equal(
    gesture.start({ ...touch(1), pointerType: 'mouse' }, false),
    undefined
  )
  assert.equal(gesture.hasPointers, false)
  gesture.start(touch(1), false)
  gesture.start(touch(2, 100), true)
  gesture.reset()
  assert.equal(gesture.pinching, false)
  assert.equal(gesture.hasPointers, false)
  assert.equal(gesture.start(touch(3), false), undefined)
})
