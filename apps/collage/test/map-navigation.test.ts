import assert from 'node:assert/strict'
import { test } from 'node:test'
import { suspendMapNavigation } from '../src/lib/map-navigation.ts'

test('pen navigation blocks panning while preserving scroll and pinch zoom', () => {
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
  assert.equal(handlers.dragPan.isEnabled(), false)
  assert.equal(handlers.keyboard.isEnabled(), false)
  assert.equal(handlers.scrollZoom.isEnabled(), true)
  assert.equal(handlers.touchZoomRotate.isEnabled(), true)

  // Zoom handlers are left untouched, even if their settings change during pen mode.
  handlers.scrollZoom.disable()

  restore()
  assert.deepEqual(
    Object.values(handlers).map((h) => h.isEnabled()),
    initial.map((enabled, i) => (i === 1 ? false : enabled))
  )
  assert.equal(canvas.style.touchAction, 'pan-y')

  // Cleanup after a completed/cancelled stroke must not undo a later setting.
  handlers.dragPan.disable()
  canvas.style.touchAction = 'manipulation'
  restore()
  assert.equal(handlers.dragPan.isEnabled(), false)
  assert.equal(canvas.style.touchAction, 'manipulation')
})
