import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DragThreshold } from '../src/lib/drag-threshold.ts'

for (const pointerType of ['pen', 'touch']) {
  test(`${pointerType} tap jitter stays a selection until deliberate movement`, () => {
    const drag = new DragThreshold({ pointerType, clientX: 100, clientY: 100 })
    assert.equal(drag.started, false)
    for (const [clientX, clientY] of [
      [100.5, 101],
      [103, 104],
      [108, 100]
    ])
      assert.equal(drag.update({ clientX, clientY }), false)
    assert.equal(drag.update({ clientX: 109, clientY: 100 }), true)
    // Returning inside the tolerance must still move the map back to its origin.
    assert.equal(drag.update({ clientX: 101, clientY: 100 }), true)
    assert.equal(drag.update({ clientX: 100, clientY: 100 }), true)
  })
}

test('mouse movement has a smaller tolerance without starting on click jitter', () => {
  const drag = new DragThreshold({
    pointerType: 'mouse',
    clientX: 0,
    clientY: 0
  })
  assert.equal(drag.update({ clientX: 1, clientY: 1 }), false)
  assert.equal(drag.update({ clientX: 3, clientY: 0 }), false)
  assert.equal(drag.update({ clientX: 4, clientY: 0 }), true)
})

test('movement crossing and returning between animation frames stays a drag', () => {
  const start = { pointerType: 'pen', clientX: 200, clientY: 100 }
  const first = new DragThreshold(start)
  first.update({ clientX: 200, clientY: 120 })
  first.update(start)
  assert.equal(first.started, true)
  // The next tap is independent of the previous drag.
  assert.equal(new DragThreshold(start).update(start), false)
})
