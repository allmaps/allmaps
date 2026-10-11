import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bindMaskStylus } from '../src/lib/mask-stylus.ts'

class Canvas extends EventTarget {
  captured = new Set<number>()
  setPointerCapture(id: number) {
    this.captured.add(id)
  }
  hasPointerCapture(id: number) {
    return this.captured.has(id)
  }
  releasePointerCapture(id: number) {
    this.captured.delete(id)
  }
}

function pointer(type: string, pointerType = 'pen', pointerId = 1) {
  return Object.assign(new Event(type, { cancelable: true }), {
    pointerType,
    pointerId,
    button: type === 'pointermove' ? -1 : 0,
    buttons: type === 'pointerup' ? 0 : 1
  })
}

function setup(allowTouch = false) {
  const canvas = new Canvas()
  const windowTarget = new EventTarget()
  const calls: string[] = []
  const unbind = bindMaskStylus(canvas, windowTarget, {
    start: () => calls.push('start'),
    end: () => calls.push('end'),
    cancel: () => calls.push('cancel'),
    allowTouch: () => allowTouch
  })
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'touchmove'])
    canvas.addEventListener(type, () => calls.push(type))
  return { canvas, windowTarget, calls, unbind }
}

test('Pencil contact captures the stroke without swallowing drawing events; lift finishes before unlocking', async () => {
  const { canvas, calls, unbind } = setup()
  const down = pointer('pointerdown')
  canvas.dispatchEvent(down)
  assert.equal(canvas.hasPointerCapture(1), true)
  assert.equal(down.defaultPrevented, true)
  const move = pointer('pointermove')
  canvas.dispatchEvent(move)
  assert.equal(move.defaultPrevented, true)
  canvas.dispatchEvent(pointer('pointerup'))
  assert.equal(canvas.hasPointerCapture(1), false)
  assert.deepEqual(calls, ['start', 'pointerdown', 'pointermove', 'pointerup'])
  // Normal release of implicit capture must not cancel a completed stroke.
  canvas.dispatchEvent(pointer('lostpointercapture'))
  await Promise.resolve()
  assert.equal(calls.at(-1), 'end')
  assert.ok(!calls.includes('cancel'))
  unbind()
})

test('pen hover and ordinary fingers/mouse preserve normal navigation', () => {
  const { canvas, calls, unbind } = setup()
  const hover = pointer('pointermove')
  canvas.dispatchEvent(hover)
  assert.equal(hover.defaultPrevented, false)
  for (const type of ['touch', 'mouse']) {
    canvas.dispatchEvent(pointer('pointerdown', type))
    canvas.dispatchEvent(pointer('pointerup', type))
  }
  assert.ok(!calls.includes('start'))
  assert.equal(canvas.captured.size, 0)
  unbind()
})

test('a second primary pointer cannot steal a shape or polygon gesture', () => {
  const { canvas, calls, unbind } = setup()
  canvas.dispatchEvent(pointer('pointerdown'))
  for (const type of ['pointerdown', 'pointermove', 'pointerup'])
    canvas.dispatchEvent(pointer(type, 'touch', 2))
  canvas.dispatchEvent(pointer('pointermove', 'mouse', 3))
  const touch = new Event('touchmove', { cancelable: true })
  canvas.dispatchEvent(touch)
  assert.equal(touch.defaultPrevented, true)
  assert.deepEqual(calls, ['start', 'pointerdown'])
  assert.equal(canvas.hasPointerCapture(1), true)
  unbind()
})

test('freehand keeps second-finger pointer events for pen-anchored zoom while blocking native touch navigation', () => {
  const { canvas, calls, unbind } = setup(true)
  canvas.dispatchEvent(pointer('pointerdown'))
  canvas.dispatchEvent(pointer('pointerdown', 'touch', 2))
  canvas.dispatchEvent(pointer('pointermove', 'touch', 2))
  canvas.dispatchEvent(new Event('touchmove', { cancelable: true }))
  canvas.dispatchEvent(pointer('pointerup', 'touch', 2))
  assert.deepEqual(calls, [
    'start',
    'pointerdown',
    'pointerdown',
    'pointermove',
    'pointerup'
  ])
  assert.equal(canvas.hasPointerCapture(1), true)
  unbind()
})

for (const interruption of ['pointercancel', 'lostpointercapture', 'blur']) {
  test(`${interruption} cancels once, releases capture and allows the next stroke`, () => {
    const { canvas, windowTarget, calls, unbind } = setup()
    canvas.dispatchEvent(pointer('pointerdown'))
    if (interruption === 'blur') windowTarget.dispatchEvent(new Event('blur'))
    else canvas.dispatchEvent(pointer(interruption))
    canvas.dispatchEvent(pointer('lostpointercapture'))
    assert.equal(calls.filter((call) => call === 'cancel').length, 1)
    assert.equal(canvas.captured.size, 0)
    canvas.dispatchEvent(pointer('pointerdown', 'pen', 2))
    assert.equal(canvas.hasPointerCapture(2), true)
    unbind()
    assert.equal(canvas.captured.size, 0)
  })
}

test('rapid Pencil re-contact does not unlock the next stroke', async () => {
  const { canvas, calls, unbind } = setup()
  canvas.dispatchEvent(pointer('pointerdown'))
  canvas.dispatchEvent(pointer('pointerup'))
  canvas.dispatchEvent(pointer('pointerdown', 'pen', 2))
  await Promise.resolve()
  assert.ok(!calls.includes('end'))
  assert.equal(canvas.hasPointerCapture(2), true)
  unbind()
})

test('leaving mask mode removes input handlers and releases an active Pencil stroke', () => {
  const { canvas, windowTarget, calls, unbind } = setup()
  canvas.dispatchEvent(pointer('pointerdown'))
  unbind()
  assert.equal(canvas.captured.size, 0)
  assert.equal(calls.at(-1), 'cancel')
  calls.length = 0
  canvas.dispatchEvent(pointer('pointerdown'))
  canvas.dispatchEvent(pointer('pointermove'))
  canvas.dispatchEvent(pointer('pointerup'))
  windowTarget.dispatchEvent(new Event('blur'))
  assert.deepEqual(calls, ['pointerdown', 'pointermove', 'pointerup'])
})
