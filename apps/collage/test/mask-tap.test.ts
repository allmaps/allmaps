import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MaskVertexTaps } from '../src/lib/mask-tap.ts'

const touch = (timeStamp: number, clientX = 100, pointerId = 1) => ({
  pointerId,
  pointerType: 'touch',
  clientX,
  clientY: 100,
  timeStamp
})
const tap = (gesture: MaskVertexTaps, time: number, vertex = 0) => {
  gesture.start(touch(time), vertex)
  return gesture.end(touch(time + 60), vertex)
}

test('two quick taps remove the same vertex, including vertex zero', () => {
  const gesture = new MaskVertexTaps()
  assert.equal(tap(gesture, 0), undefined)
  assert.equal(tap(gesture, 200), 0)
  assert.equal(tap(gesture, 400), undefined)
})

test('different vertices and slow taps are not double taps', () => {
  const gesture = new MaskVertexTaps()
  tap(gesture, 0, 0)
  assert.equal(tap(gesture, 200, 1), undefined)
  assert.equal(tap(gesture, 800, 1), undefined)
})

test('dragging out and back, or holding down, must not delete a vertex', () => {
  const gesture = new MaskVertexTaps()
  tap(gesture, 0)
  gesture.start(touch(200), 0)
  gesture.move(touch(220, 130))
  gesture.move(touch(240, 100))
  assert.equal(gesture.end(touch(260), 0), undefined)
  assert.equal(tap(gesture, 400), undefined)
  gesture.start(touch(550), 0)
  assert.equal(gesture.end(touch(900), 0), undefined)
})

test('pinching cancels the candidate and cannot become a double tap', () => {
  const gesture = new MaskVertexTaps()
  tap(gesture, 0)
  gesture.start(touch(200), 0)
  gesture.start(touch(210, 200, 2), 1)
  assert.equal(gesture.end(touch(220, 200, 2), 1), undefined)
  assert.equal(gesture.end(touch(230), 0), undefined)
  assert.equal(tap(gesture, 350), undefined)
})

test('cancellation, empty space and mouse input do not remove vertices', () => {
  const gesture = new MaskVertexTaps()
  tap(gesture, 0)
  gesture.reset()
  assert.equal(tap(gesture, 200), undefined)
  gesture.start(touch(300), undefined)
  gesture.end(touch(350), undefined)
  assert.equal(tap(gesture, 450), undefined)
  const mouse = { ...touch(600), pointerType: 'mouse' }
  gesture.start(mouse, 0)
  assert.equal(gesture.end(mouse, 0), undefined)
})
