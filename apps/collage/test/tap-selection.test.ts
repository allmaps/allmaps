import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TapSelection } from '../src/lib/tap-selection.ts'
import { TouchNavigation } from '../src/lib/touch-navigation.ts'

const pointer = (changes = {}) => ({
  pointerId: 1,
  clientX: 100,
  clientY: 100,
  timeStamp: 0,
  pointerType: 'touch',
  isPrimary: true,
  ...changes
})

test('a short tap with small jitter selects exactly once, on release', () => {
  const tap = new TapSelection()
  tap.start(pointer(), 'map')
  tap.move(pointer({ clientX: 103, clientY: 102, timeStamp: 50 }))
  assert.equal(tap.end(pointer({ timeStamp: 120 })), 'map')
  assert.equal(tap.end(pointer({ timeStamp: 150 })), undefined)
})

test('dragging away and returning cannot become a selection tap', () => {
  const tap = new TapSelection()
  tap.start(pointer(), 'map')
  tap.move(pointer({ clientX: 130 }))
  tap.move(pointer())
  assert.equal(tap.end(pointer({ timeStamp: 200 })), undefined)
})

test('release checks movement even if no pointermove was delivered', () => {
  const tap = new TapSelection()
  tap.start(pointer(), 'map')
  assert.equal(tap.end(pointer({ clientY: 109, timeStamp: 200 })), undefined)
})

test('long presses cancel while an empty-canvas tap clears the selection', () => {
  const tap = new TapSelection()
  tap.start(pointer(), 'map')
  assert.equal(tap.end(pointer({ timeStamp: 800 })), undefined)
  tap.start(pointer(), 'map')
  tap.start(pointer())
  assert.equal(tap.end(pointer({ timeStamp: 200 })), null)
})

test('panning from empty canvas does not clear the selection on release', () => {
  const tap = new TapSelection()
  tap.start(pointer())
  tap.move(pointer({ clientX: 120 }))
  assert.equal(tap.end(pointer({ timeStamp: 200 })), undefined)
  tap.start(pointer())
  tap.cancel()
  assert.equal(tap.end(pointer({ timeStamp: 200 })), undefined)
})

test('camera movement, pointercancel, mode exit and blur can cancel a tap', () => {
  const tap = new TapSelection()
  tap.start(pointer(), 'map')
  tap.cancel()
  assert.equal(tap.end(pointer({ timeStamp: 200 })), undefined)
  tap.start(pointer(), 'next')
  assert.equal(tap.end(pointer({ timeStamp: 200 })), 'next')
})

test('unrelated pointer movement and release do not complete another tap', () => {
  const tap = new TapSelection()
  tap.start(pointer(), 'map')
  tap.move(pointer({ pointerId: 2, clientX: 200 }))
  assert.equal(tap.end(pointer({ pointerId: 2 })), undefined)
  assert.equal(tap.end(pointer({ timeStamp: 200 })), 'map')
})

for (const order of [
  [1, 2],
  [2, 1]
]) {
  test(`pinching cancels selection until every finger lifts (${order})`, () => {
    const tap = new TapSelection()
    const navigation = new TouchNavigation()
    navigation.start(pointer())
    tap.start(pointer(), 'map')
    const second = pointer({ pointerId: 2, isPrimary: false })
    if (navigation.start(second)) tap.cancel()
    for (const pointerId of order) {
      const end = pointer({ pointerId, timeStamp: 200 })
      // Window capture cleans navigation up before the pointerup selection handler.
      navigation.end(end)
      assert.equal(tap.end(end), undefined)
    }
    assert.equal(navigation.active, false)
    navigation.start(pointer())
    tap.start(pointer(), 'next')
    assert.equal(tap.end(pointer({ timeStamp: 200 })), 'next')
  })
}

test('replacing a finger cannot restart selection during a pinch', () => {
  const tap = new TapSelection()
  const navigation = new TouchNavigation()
  navigation.start(pointer())
  tap.start(pointer(), 'map')
  if (navigation.start(pointer({ pointerId: 2, isPrimary: false })))
    tap.cancel()
  navigation.end(pointer({ pointerId: 1 }))
  navigation.start(pointer({ pointerId: 3, isPrimary: false }))
  assert.equal(navigation.active, true)
  for (const pointerId of [2, 3]) {
    navigation.end(pointer({ pointerId }))
    assert.equal(tap.end(pointer({ pointerId, timeStamp: 200 })), undefined)
  }
  assert.equal(navigation.active, false)
})

for (const pointerType of ['touch', 'mouse', 'pen']) {
  test(`${pointerType} can select using the same tap logic`, () => {
    const tap = new TapSelection()
    tap.start(pointer({ pointerType }), 'map')
    assert.equal(tap.end(pointer({ pointerType, timeStamp: 100 })), 'map')
  })
}
