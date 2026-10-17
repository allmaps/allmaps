import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  controlLayout,
  controlFold,
  foldControl,
  controlOrder,
  radiusForSize,
  fitControlGeometry,
  fitControlCenter,
  preferredControlCenter,
  controlRadius,
  sliderLength,
  railValue,
  snapSaturation,
  hueColor
} from '../src/lib/control-layout.ts'
import type { Point } from '@allmaps/types'
import type { RingControl } from '../src/lib/control-layout.ts'

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
function close(a: number, b: number) {
  assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)
}

test('opening and closing travel along the arc toward its end, including across angle wrapping', () => {
  for (const rotation of [0, Math.PI, -Math.PI / 2, 8]) {
    const center: Point = [300, 300]
    const layout = controlLayout(center, rotation, {
      saturation: 1,
      opacity: 0.3,
      hue: 0.8
    })
    for (const kind of controlOrder) {
      const start = layout[kind].position
      const target = controlFold(center, rotation, controlRadius).target
      assert.deepEqual(target, layout.rotate.position)
      assert.deepEqual(foldControl(start, center, target, 0), start)
      assert.deepEqual(foldControl(start, center, target, 1), target)
      const middle = foldControl(start, center, target, 0.5)
      close(
        distance(middle, center),
        (distance(start, center) + controlRadius) / 2
      )
      if (distance(start, target) > 1e-8)
        assert.ok(distance(middle, target) < distance(start, target))
    }
  }
})

test('the toggle anchors one end for compact and expanded rings, and folding stays on the same arc', () => {
  const center: Point = [300, 300]
  const compact = ['move', 'rotate', 'remove', 'more'] as const
  const expanded = [...controlOrder, 'more'] as const
  for (const rotation of [0, Math.PI, -Math.PI / 2, 8]) {
    const small = controlLayout(
      center,
      rotation,
      { saturation: 1, opacity: 1, hue: 0 },
      controlRadius,
      compact
    )
    const large = controlLayout(
      center,
      rotation,
      { saturation: 1, opacity: 1, hue: 0 },
      controlRadius,
      expanded
    )
    assert.deepEqual(small.more.position, large.more.position)
    for (const order of [compact, expanded]) {
      const layout = controlLayout(
        center,
        rotation,
        { saturation: 1, opacity: 1, hue: 0 },
        controlRadius,
        order
      )
      assert.deepEqual(
        controlFold(center, rotation, controlRadius, order).target,
        layout.more.position
      )
      const first = layout[order[0]].position
      const last = layout.more.position
      const middle = foldControl(first, center, last, 0.5)
      // The expanded arc is centered at 45° minus the map rotation.
      if (order === expanded) {
        close(
          middle[0],
          center[0] + Math.cos(Math.PI / 4 - rotation) * controlRadius
        )
        close(
          middle[1],
          center[1] + Math.sin(Math.PI / 4 - rotation) * controlRadius
        )
      }
    }
  }
})

test('buttons have equal spacing on a semicircle with one layer-order control', () => {
  const layout = controlLayout([0, 0], 0, { saturation: 1, opacity: 1, hue: 0 })
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
  const initial = controlLayout([0, 0], 0, {
    saturation: 0.6,
    opacity: 0.7,
    hue: 0.3
  })
  const moved = controlLayout([500, 300], Math.PI / 2, {
    saturation: 0.6,
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
  close(
    distance(moved.saturation.rail!.start, moved.saturation.position),
    (0.6 / 2) * sliderLength
  )
})

test('radial slider values survive recomputing layout and ignore perpendicular motion', () => {
  const values = { saturation: 0.6, opacity: 0.4, hue: 0.8 }
  for (const rotation of [0, 0.5, Math.PI, -Math.PI / 2]) {
    const layout = controlLayout([200, 400], rotation, values)
    for (const key of ['opacity', 'hue', 'saturation'] as const) {
      const { position, rail } = layout[key]
      const maximum = key === 'saturation' ? 2 : 1
      close(railValue(position, rail!) * maximum, values[key])
      close(railValue(rail!.start, rail!), 0)
      close(railValue(rail!.end, rail!), 1)
      const offset: Point = [
        position[0] - (rail!.end[1] - rail!.start[1]),
        position[1] + rail!.end[0] - rail!.start[0]
      ]
      close(railValue(offset, rail!) * maximum, values[key])
    }
  }
})

test('opacity and saturation increase toward the map while hue increases away from it', () => {
  for (const rotation of [0, 0.8, Math.PI]) {
    const center: Point = [200, 400]
    const zero = controlLayout(center, rotation, {
      saturation: 0,
      opacity: 0,
      hue: 0
    })
    const one = controlLayout(center, rotation, {
      saturation: 1,
      opacity: 1,
      hue: 1
    })
    const two = controlLayout(center, rotation, {
      saturation: 2,
      opacity: 1,
      hue: 0
    })
    close(distance(one.saturation.position, center), controlRadius)
    close(
      distance(zero.saturation.position, center),
      controlRadius + sliderLength / 2
    )
    close(
      distance(two.saturation.position, center),
      controlRadius - sliderLength / 2
    )
    close(railValue(one.saturation.position, one.saturation.rail!), 0.5)
    close(railValue(two.saturation.position, two.saturation.rail!), 1)
    close(distance(one.opacity.position, center), controlRadius)
    close(distance(zero.opacity.position, center), controlRadius + sliderLength)
    close(distance(zero.hue.position, center), controlRadius)
    close(distance(one.hue.position, center), controlRadius + sliderLength)
  }
})

test('hue colors match the complete slider spectrum', () => {
  assert.equal(hueColor(0), '#ff0000')
  assert.equal(hueColor(1 / 3), '#00ff00')
  assert.equal(hueColor(2 / 3), '#0000ff')
  assert.equal(hueColor(1), '#ff0000')
})

test('saturation snaps from either side of the ring, with a bounded zone on shorter rails', () => {
  for (const [length, insidePixels, outsidePixels] of [
    [24, 2, 3],
    [60, 5, 7],
    [104, 5, 7]
  ]) {
    for (const rotation of [0, 0.5, Math.PI]) {
      const { rail } = controlLayout(
        [200, 400],
        rotation,
        { saturation: 1, opacity: 1, hue: 0 },
        120,
        controlOrder,
        Math.PI,
        length
      ).saturation
      for (const direction of [-1, 1]) {
        const inside = 1 + (direction * 2 * insidePixels) / length
        assert.equal(snapSaturation(inside, rail!), 1)
        const outside = 1 + (direction * 2 * outsidePixels) / length
        assert.equal(snapSaturation(outside, rail!), outside)
      }
      for (const value of [0, 1, 2])
        assert.equal(snapSaturation(value, rail!), value)
    }
  }
})

test('the arc faces bottom right and contracts with zoom without colliding buttons', () => {
  const radius = radiusForSize(30)
  assert.ok(radius < controlRadius)
  const layout = controlLayout(
    [0, 0],
    0,
    { saturation: 1, opacity: 1, hue: 0 },
    radius
  )
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

test('sparse rings keep adjacent buttons close on large maps without losing their curve', () => {
  for (const order of [
    ['move', 'rotate'],
    ['move', 'rotate', 'remove'],
    ['move', 'rotate', 'remove', 'more'],
    ['move', 'rotate', 'remove', 'front', 'more']
  ] as const) {
    for (const diameter of [20, 500, 10000]) {
      const radius = radiusForSize(diameter, order.length)
      const layout = controlLayout(
        [0, 0],
        0,
        { saturation: 1, opacity: 1, hue: 0 },
        radius,
        order
      )
      for (let i = 1; i < order.length; i++) {
        const gap = distance(
          layout[order[i - 1]].position,
          layout[order[i]].position
        )
        assert.ok(gap >= 44 && gap <= 56 + 1e-8)
      }
      assert.ok(radius >= 72 && radius < 74)
    }
  }
})

test('clipped map controls and full slider rails stay on screen as one fixed arc', () => {
  const center: Point = [1160, 360]
  const values = { saturation: 0.6, opacity: 0.5, hue: 0.2 }
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
      controlLayout(center, 0, { saturation: 1, opacity: 1, hue: 1 }),
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

test('crowded rings wrap further on small screens while retaining touch spacing', () => {
  const order: RingControl[] = [...controlOrder, 'more']
  const desktop = fitControlGeometry(10000, order, [1280, 900])
  close(desktop.arc, Math.PI)
  close(desktop.radius, radiusForSize(10000, order.length))
  close(desktop.sliderLength, sliderLength)
  for (const width of [320, 390, 520]) {
    const viewport: Point = [width, 700]
    const geometry = fitControlGeometry(10000, order, viewport)
    assert.ok(geometry.arc > Math.PI && geometry.arc < 2 * Math.PI)
    assert.ok(geometry.radius < desktop.radius)
    assert.ok(
      geometry.sliderLength >= 24 && geometry.sliderLength <= sliderLength
    )
    for (const tools of [order, [...order].reverse()]) {
      for (const rotation of [0, 0.5, 1.2, Math.PI, -Math.PI / 2]) {
        for (const values of [
          { opacity: 1, saturation: 1, hue: 0 },
          { opacity: 0, saturation: 0, hue: 1 },
          { opacity: 0.4, saturation: 0.6, hue: 0.8 },
          { opacity: 1, saturation: 1.15, hue: 0 },
          { opacity: 1, saturation: 1.5, hue: 0 },
          { opacity: 1, saturation: 2, hue: 0 }
        ]) {
          const at = (center: Point) =>
            controlLayout(
              center,
              rotation,
              values,
              geometry.radius,
              tools,
              geometry.arc,
              geometry.sliderLength
            )
          const pivot: Point = [width - 10, 90]
          const center = fitControlCenter(pivot, at(pivot), viewport, true)
          const layout = Object.values(at(center))
          for (let i = 0; i < layout.length; i++) {
            for (let j = i + 1; j < layout.length; j++)
              assert.ok(
                distance(layout[i].position, layout[j].position) >= 44 - 1e-8
              )
            const { position, rail } = layout[i]
            for (const [x, y] of [
              position,
              ...(rail ? [rail.start, rail.end] : [])
            ]) {
              assert.ok(
                x >= 21 && x <= width - 21,
                `button outside ${width}px viewport: ${x}`
              )
              assert.ok(y >= 70 && y <= viewport[1] - 21)
            }
          }
        }
      }
    }
  }
})

test('compact rings keep their short arc and empty layouts have finite geometry', () => {
  const compact = ['move', 'rotate', 'remove', 'more'] as const
  const desktop = fitControlGeometry(10000, compact, [1280, 900])
  assert.deepEqual(fitControlGeometry(10000, compact, [390, 700]), desktop)
  for (const tools of [[], ['move']] as const)
    assert.ok(
      Object.values(fitControlGeometry(100, tools, [320, 500])).every(
        Number.isFinite
      )
    )
})

test('wrapped rings keep the same fitted center as they rotate or sliders move', () => {
  const order: RingControl[] = [...controlOrder, 'more']
  const viewport: Point = [390, 700]
  const geometry = fitControlGeometry(10000, order, viewport)
  const pivot: Point = [30, 500]
  let fitted: Point | undefined
  for (const rotation of [0, 0.5, Math.PI, -Math.PI / 2]) {
    for (const value of [0, 0.4, 1]) {
      const layout = controlLayout(
        pivot,
        rotation,
        { opacity: value, saturation: value * 2, hue: value },
        geometry.radius,
        order,
        geometry.arc,
        geometry.sliderLength
      )
      const center = fitControlCenter(pivot, layout, viewport, true)
      if (fitted) {
        close(center[0], fitted[0])
        close(center[1], fitted[1])
      } else fitted = center
    }
  }
})

test('rings beyond a semicircle fold along the occupied arc, including through angle wrapping', () => {
  const order: RingControl[] = [...controlOrder, 'more']
  const geometry = fitControlGeometry(10000, order, [390, 700])
  const center: Point = [200, 300]
  for (const rotation of [0, Math.PI, -Math.PI / 2, 8]) {
    const layout = controlLayout(
      center,
      rotation,
      { opacity: 1, saturation: 1, hue: 0 },
      geometry.radius,
      order,
      geometry.arc,
      geometry.sliderLength
    )
    const fold = controlFold(
      center,
      rotation,
      geometry.radius,
      order,
      geometry.arc
    )
    assert.deepEqual(fold.target, layout.more.position)
    for (let i = 0; i < order.length; i++) {
      const position = layout[order[i]].position
      const sweep = geometry.arc * (1 - i / (order.length - 1))
      const angle = (3 * Math.PI) / 4 - rotation - sweep / 2
      const halfway = foldControl(
        position,
        center,
        fold.target,
        0.5,
        fold.clockwise
      )
      close(halfway[0], center[0] + Math.cos(angle) * geometry.radius)
      close(halfway[1], center[1] + Math.sin(angle) * geometry.radius)
    }
  }
})
