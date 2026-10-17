import type { Point } from '@allmaps/types'

// Equal angular intervals on an arc facing bottom right.
export const controlOrder = [
  'remove',
  'front',
  'duplicate',
  'openIn',
  'background',
  'saturation',
  'hue',
  'opacity',
  'editMask',
  'mirror',
  'transform',
  'reset',
  'lock',
  'move',
  'rotate'
] as const
export type Control = (typeof controlOrder)[number]
export type RingControl = Control | 'more'
export type Slider = 'opacity' | 'hue' | 'saturation'
export type Rail = { start: Point; end: Point }
export type ControlPosition = { position: Point; rail?: Rail }
export type ControlFold = { center: Point; target: Point; clockwise?: boolean }

/** Follow the controls' circle toward one end, bringing sliders inward too. */
export function foldControl(
  position: Point,
  center: Point,
  target: Point,
  progress: number,
  clockwise = false
): Point {
  if (progress <= 0) return position
  if (progress >= 1) return target
  const start = Math.atan2(position[1] - center[1], position[0] - center[0])
  const end = Math.atan2(target[1] - center[1], target[0] - center[0])
  let sweep = Math.atan2(Math.sin(end - start), Math.cos(end - start))
  // Expanded rings can exceed 180°. Follow their occupied arc to the toggle,
  // rather than taking a shortcut through the gap between its endpoints.
  if (Math.abs(sweep) < 1e-8) sweep = 0
  else if (clockwise && sweep < 0) sweep += 2 * Math.PI
  // Opposite endpoints must take the same half-circle as the other tools,
  // even when floating-point error makes the wrapped difference −π.
  if (Math.abs(Math.abs(sweep) - Math.PI) < 1e-8) sweep = Math.PI
  const angle = start + sweep * progress
  const radius =
    Math.hypot(position[0] - center[0], position[1] - center[1]) *
      (1 - progress) +
    Math.hypot(target[0] - center[0], target[1] - center[1]) * progress
  return [
    center[0] + Math.cos(angle) * radius,
    center[1] + Math.sin(angle) * radius
  ]
}
// Shared opening/closing duration for every tool ring (milliseconds).
export const TOOL_RING_ANIMATION_MS = 180

export function controlFold(
  center: Point,
  rotation: number,
  radius: number,
  order: readonly RingControl[] = controlOrder,
  arc = Math.PI
): ControlFold {
  const angle = endAngle(order, arc) - rotation
  return {
    center,
    clockwise: true,
    target: [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius
    ] as Point
  }
}
export const controlRadius = 200
export const sliderLength = 104

function angularStep(count: number, arc = Math.PI): number {
  // Sparse tool sets occupy a shorter arc, rather than opposing ends of a
  // diameter. Dense sets can wrap farther around when the viewport is small.
  return Math.min(Math.PI / 4, arc / Math.max(1, count - 1))
}

function endAngle(order: readonly RingControl[], arc = Math.PI): number {
  // Keep the +/− end anchored as the ring expands. Without a toggle, center
  // sparse tool sets on the usual short arc.
  return order.includes('more')
    ? (3 * Math.PI) / 4
    : Math.PI / 4 +
        (angularStep(order.length, arc) * Math.max(0, order.length - 1)) / 2
}

export function radiusForSize(
  diameter: number,
  count: number = controlOrder.length,
  arc = Math.PI
): number {
  // Retain a visible curve for small sets and 44px clearance even when the
  // saturation knob moves inward past the closest point to its neighbor.
  const minimum = Math.max(72, 44 / Math.sin(angularStep(count, arc)))
  // Keep adjacent buttons at most 56px apart, even on a large map. Sparse
  // rings retain their curve without spreading a few tools across the map.
  const compact = 28 / Math.sin(angularStep(count, arc) / 2)
  return Math.max(minimum, Math.min(controlRadius, compact, diameter * 0.3))
}

function topInset(viewport: Point): number {
  return viewport[0] <= 440 ? 110 : 70
}

/** Keep 44px between button centers, wrapping a crowded ring before shortening
 * its rails. Reserve their full travel so moving a slider cannot reflow it. */
export function fitControlGeometry(
  diameter: number,
  order: readonly RingControl[],
  viewport: Point
) {
  const count = order.length
  const hasSliders = order.some((tool) =>
    ['opacity', 'hue', 'saturation'].includes(tool)
  )
  const outerRadius =
    Math.min(viewport[0] - 48, viewport[1] - topInset(viewport) - 24) / 2
  const targetRadius = Math.max(
    72,
    outerRadius - (hasSliders ? sliderLength : 0)
  )
  // Leave at least one button interval between the endpoints of a nearly
  // complete circle. Sparse sets retain their existing short arc.
  const maxArc = Math.max(
    Math.PI,
    (2 * Math.PI * (count - 1)) / Math.max(1, count)
  )
  const arc = Math.max(
    Math.PI,
    Math.min(maxArc, Math.asin(44 / targetRadius) * (count - 1))
  )
  const radius = Math.max(
    radiusForSize(0, count, arc),
    Math.min(radiusForSize(diameter, count, arc), targetRadius)
  )
  return {
    arc,
    radius,
    sliderLength: hasSliders
      ? Math.max(24, Math.min(sliderLength, outerRadius - radius))
      : sliderLength
  }
}

/** Blend toward the screen center based on size, never the clipped polygon's
 * moving centroid. Large maps keep a stable dock while the camera pans. */
export function preferredControlCenter(
  pivot: Point,
  diameter: number,
  viewport: Point
): Point {
  const t = Math.max(
    0,
    Math.min(1, (diameter / Math.min(...viewport) - 0.85) / 0.75)
  )
  const weight = t * t * (3 - 2 * t)
  return [
    pivot[0] * (1 - weight) + (viewport[0] / 2) * weight,
    pivot[1] * (1 - weight) + (viewport[1] / 2) * weight
  ]
}

export function controlLayout(
  center: Point,
  rotation: number,
  values: Record<Slider, number>,
  radius = controlRadius,
  order: readonly RingControl[] = controlOrder,
  arc = Math.PI,
  railLength = sliderLength
): Record<RingControl, ControlPosition> {
  const step = angularStep(order.length, arc)
  const span = step * Math.max(0, order.length - 1)
  const layout = Object.fromEntries(
    order.map((kind, index) => {
      // Screen Y points down; map rotation is counterclockwise in world space.
      const angle = endAngle(order, arc) - span + index * step - rotation
      const at = (radius: number): Point => [
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius
      ]
      const isSlider =
        kind === 'opacity' || kind === 'hue' || kind === 'saturation'
      // Original saturation (100%) sits halfway along its rail, on the ring.
      // Both saturation and opacity increase inward; hue increases outward.
      const inward = kind !== 'hue'
      const start =
        radius +
        (kind === 'saturation' ? railLength / 2 : inward ? railLength : 0)
      const end =
        radius +
        (kind === 'saturation' ? -railLength / 2 : inward ? 0 : railLength)
      return [
        kind,
        {
          position: at(
            isSlider
              ? start +
                  ((end - start) * values[kind]) /
                    (kind === 'saturation' ? 2 : 1)
              : radius
          ),
          ...(isSlider
            ? {
                rail: {
                  start: at(start),
                  end: at(end)
                }
              }
            : {})
        }
      ]
    })
  ) as Record<RingControl, ControlPosition>
  return layout
}

export function railValue(pointer: Point, rail: Rail): number {
  const dx = rail.end[0] - rail.start[0]
  const dy = rail.end[1] - rail.start[1]
  return (
    ((pointer[0] - rail.start[0]) * dx + (pointer[1] - rail.start[1]) * dy) /
    (dx * dx + dy * dy)
  )
}

/** A small detent at original saturation; cap its width on short mobile rails. */
export function snapSaturation(value: number, rail: Rail): number {
  const length = Math.hypot(
    rail.end[0] - rail.start[0],
    rail.end[1] - rail.start[1]
  )
  const threshold = Math.min(0.2, 12 / length)
  return Math.abs(value - 1) <= threshold ? 1 : value
}

// Move the entire arc together so a narrow visible part near an edge still
// provides usable controls. Include full rails, so adjusting a slider cannot
// move the arc. Keep each button in place relative to the other controls.
export function fitControlCenter(
  center: Point,
  layout: Record<RingControl, ControlPosition>,
  viewport: Point,
  coverCircle = false
): Point {
  const positions = Object.values(layout).flatMap((control) => {
    return control.rail
      ? [control.rail.start, control.rail.end]
      : [control.position]
  })
  if (!positions.length) return center
  if (coverCircle) {
    // A wrapped ring can turn in either direction during rotation. Reserve its
    // whole circle so no handle leaves the screen while the pivot is frozen.
    const radius = Math.max(
      ...positions.map(([x, y]) => Math.hypot(x - center[0], y - center[1]))
    )
    positions.push(
      [center[0] - radius, center[1] - radius],
      [center[0] + radius, center[1] + radius]
    )
  }
  return center.map((value, axis) => {
    const minimum = Math.min(...positions.map((p) => p[axis]))
    const maximum = Math.max(...positions.map((p) => p[axis]))
    const lower = (axis === 1 ? topInset(viewport) : 24) - minimum
    const upper = viewport[axis] - 24 - maximum
    return (
      value +
      (lower <= upper
        ? Math.max(lower, Math.min(0, upper))
        : (lower + upper) / 2)
    )
  }) as Point
}

export function hueColor(hue: number): string {
  const sector = (((hue % 1) + 1) % 1) * 6
  const x = 1 - Math.abs((sector % 2) - 1)
  const colors = [
    [1, x, 0],
    [x, 1, 0],
    [0, 1, x],
    [0, x, 1],
    [x, 0, 1],
    [1, 0, x]
  ]
  return (
    '#' +
    colors[Math.floor(sector)]
      .map((value) =>
        Math.round(value * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}
