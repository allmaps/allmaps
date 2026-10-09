import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  controlLayout,
  controlOrder,
  radiusForSize,
  fitControlCenter,
  preferredControlCenter,
  controlRadius,
  sliderLength,
  railValue,
  hueColor
} from '../src/lib/control-layout.ts'
import type { Point } from '@allmaps/types'

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
function close(a: number, b: number) {
  assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)
}

test('buttons have equal spacing on a semicircle with one layer-order control', () => {
  const layout = controlLayout([0, 0], 0, { opacity: 0, hue: 0 })
  const spacing = distance(layout.remove.position, layout.front.position)
  controlOrder.forEach((kind, index) => {
    close(distance([0, 0], layout[kind].position), controlRadius)
    if (index)
      close(
        distance(
          layout[controlOrder[index - 1]].position,
          layout[kind].position
        ),
        spacing
      )
  })
  close(
    distance(layout.remove.position, layout.rotate.position),
    controlRadius * 2
  )
})

test('buttons and slider rails rotate and translate rigidly with the map', () => {
  const initial = controlLayout([0, 0], 0, { opacity: 0.7, hue: 0.3 })
  const moved = controlLayout([500, 300], Math.PI / 2, {
    opacity: 0.7,
    hue: 0.3
  })
  for (const kind of controlOrder) {
    const a = initial[kind].position
    const b = moved[kind].position
    close(b[0], 500 + a[1])
    close(b[1], 300 - a[0])
  }
  close(
    distance(moved.opacity.rail!.start, moved.opacity.position),
    0.7 * sliderLength
  )
  close(distance(moved.hue.rail!.start, moved.hue.position), 0.3 * sliderLength)
})

test('radial slider values survive recomputing layout and ignore perpendicular motion', () => {
  const values = { opacity: 0.4, hue: 0.8 }
  for (const rotation of [0, 0.5, Math.PI, -Math.PI / 2]) {
    const layout = controlLayout([200, 400], rotation, values)
    for (const key of ['opacity', 'hue'] as const) {
      const { position, rail } = layout[key]
      close(railValue(position, rail!), values[key])
      close(railValue(rail!.start, rail!), 0)
      close(railValue(rail!.end, rail!), 1)
      const offset: Point = [
        position[0] - (rail!.end[1] - rail!.start[1]),
        position[1] + rail!.end[0] - rail!.start[0]
      ]
      close(railValue(offset, rail!), values[key])
    }
  }
})

test('hue colors match the complete slider spectrum', () => {
  assert.equal(hueColor(0), '#ff0000')
  assert.equal(hueColor(1 / 3), '#00ff00')
  assert.equal(hueColor(2 / 3), '#0000ff')
  assert.equal(hueColor(1), '#ff0000')
})

test('the arc faces bottom right and contracts with zoom without colliding buttons', () => {
  const radius = radiusForSize(30)
  assert.ok(radius < controlRadius)
  const layout = controlLayout([0, 0], 0, { opacity: 0, hue: 0 }, radius)
  assert.ok(
    layout.saturation.position[0] > 0 && layout.saturation.position[1] > 0
  )
  for (let i = 1; i < controlOrder.length; i++) {
    assert.ok(
      distance(
        layout[controlOrder[i - 1]].position,
        layout[controlOrder[i]].position
      ) > 42
    )
  }
  close(radiusForSize(10000), controlRadius)
})

test('clipped map controls and full slider rails stay on screen as one fixed arc', () => {
  const center: Point = [1160, 360]
  const values = { opacity: 0.5, hue: 0.2 }
  const initial = controlLayout(center, 0, values)
  const fitted = fitControlCenter(center, initial, [1280, 720])
  const layout = controlLayout(fitted, 0, values)
  for (const control of Object.values(layout)) {
    for (const point of [
      control.position,
      ...(control.rail ? [control.rail.start, control.rail.end] : [])
    ]) {
      assert.ok(point[0] >= 24 && point[0] <= 1256)
      assert.ok(point[1] >= 70 && point[1] <= 696)
    }
  }
  assert.deepEqual(
    fitControlCenter(
      center,
      controlLayout(center, 0, { opacity: 1, hue: 1 }),
      [1280, 720]
    ),
    fitted
  )
})

test('large maps dock toward the screen center without following clipped fragments', () => {
  assert.deepEqual(
    preferredControlCenter([150, 200], 300, [1280, 720]),
    [150, 200]
  )
  assert.deepEqual(
    preferredControlCenter([-500, 1300], 2000, [1280, 720]),
    [640, 360]
  )
  assert.deepEqual(
    preferredControlCenter([1700, -800], 2000, [1280, 720]),
    [640, 360]
  )
  const a = preferredControlCenter([100, 100], 800, [1280, 720])
  const b = preferredControlCenter([100, 100], 801, [1280, 720])
  assert.ok(distance(a, b) < 3)
})
