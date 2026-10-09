import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TouchNavigation } from '../src/lib/touch-navigation.ts'

const touch = (pointerId: number, isPrimary = pointerId === 1) => ({
  pointerId,
  pointerType: 'touch',
  isPrimary
})

test('a second finger takes over an edit before its hit test, exactly once', () => {
  const navigation = new TouchNavigation()
  assert.equal(navigation.start(touch(1)), false)
  assert.equal(navigation.active, false)
  assert.equal(navigation.start(touch(2)), true)
  assert.equal(navigation.active, true)
  assert.equal(navigation.start(touch(3)), false)
  assert.equal(navigation.active, true)
})

for (const order of [
  [1, 2],
  [2, 1]
]) {
  test(`pinch cannot turn back into a map drag when a finger lifts (${order})`, () => {
    const navigation = new TouchNavigation()
    navigation.start(touch(1))
    navigation.start(touch(2))
    navigation.end(touch(order[0]))
    assert.equal(navigation.active, true)
    navigation.end(touch(order[1]))
    assert.equal(navigation.active, false)
    assert.equal(navigation.start(touch(4, true)), false)
    assert.equal(navigation.active, false)
  })
}

test('replacing a finger during a pinch stays navigational until all lift', () => {
  const navigation = new TouchNavigation()
  navigation.start(touch(1))
  navigation.start(touch(2))
  navigation.end(touch(2))
  assert.equal(navigation.start(touch(3)), false)
  navigation.end(touch(1))
  assert.equal(navigation.active, true)
  navigation.end(touch(3))
  assert.equal(navigation.active, false)
})

test('a nonprimary finger cannot start an edit when the first down was outside the app', () => {
  const navigation = new TouchNavigation()
  assert.equal(navigation.start(touch(2)), true)
  assert.equal(navigation.active, true)
  navigation.end(touch(2))
  assert.equal(navigation.active, false)
})

test('a single finger, mouse and stylus preserve normal editing', () => {
  const navigation = new TouchNavigation()
  navigation.start(touch(1))
  for (const pointerType of ['mouse', 'pen']) {
    const pointer = { ...touch(2), pointerType }
    assert.equal(navigation.start(pointer), false)
    navigation.end(pointer)
  }
  assert.equal(navigation.active, false)
  navigation.end(touch(1))
  assert.equal(navigation.start(touch(2, true)), false)
})

test('pointer cancellation and window blur do not leave dragging blocked', () => {
  const navigation = new TouchNavigation()
  navigation.start(touch(1))
  navigation.start(touch(2))
  // pointercancel follows the same cleanup path as pointerup.
  navigation.end(touch(1))
  navigation.end(touch(2))
  assert.equal(navigation.active, false)
  navigation.start(touch(1))
  navigation.start(touch(2))
  navigation.reset()
  assert.equal(navigation.active, false)
  assert.equal(navigation.start(touch(3, true)), false)
})
