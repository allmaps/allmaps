import assert from 'node:assert/strict'
import { test } from 'node:test'
import { suspendMapNavigation } from '../src/lib/map-navigation.ts'

test('pen navigation lock blocks pan and zoom and restores mixed handler settings', () => {
  const handler = (initial: boolean) => {
    let enabled = initial
    return {
      isEnabled: () => enabled,
      enable: () => {
        enabled = true
      },
      disable: () => {
        enabled = false
      }
    }
  }
  const handlers = {
    dragPan: handler(true),
    scrollZoom: handler(true),
    boxZoom: handler(false),
    doubleClickZoom: handler(false),
    touchZoomRotate: handler(true),
    touchPitch: handler(false),
    keyboard: handler(true)
  }
  const canvas = { style: { touchAction: 'pan-y' } }
  let stopped = false
  const map = {
    ...handlers,
    stop: () => {
      stopped = true
    },
    getCanvas: () => canvas
  }
  const initial = Object.values(handlers).map((h) => h.isEnabled())
  const restore = suspendMapNavigation(map)
  assert.equal(stopped, true)
  assert.equal(canvas.style.touchAction, 'none')
  assert.ok(Object.values(handlers).every((h) => !h.isEnabled()))

  restore()
  assert.deepEqual(
    Object.values(handlers).map((h) => h.isEnabled()),
    initial
  )
  assert.equal(canvas.style.touchAction, 'pan-y')

  // Cleanup after a completed/cancelled stroke must not undo a later setting.
  handlers.dragPan.disable()
  canvas.style.touchAction = 'manipulation'
  restore()
  assert.equal(handlers.dragPan.isEnabled(), false)
  assert.equal(canvas.style.touchAction, 'manipulation')
})
