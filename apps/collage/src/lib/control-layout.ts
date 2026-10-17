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
  'lock',
  'move',
  'rotate'
] as const
export type Control = (typeof controlOrder)[number]
export type RingControl = Control | 'more'
export type Slider = 'opacity' | 'hue'
export type Rail = { start: Point; end: Point }
export type ControlPosition = { position: Point; rail?: Rail }

/** Follow the controls' circle toward one end, bringing sliders inward too. */
export function foldControl(
  position: Point,
  center: Point,
  target: Point,
  progress: number
): Point {
  if (progress <= 0) return position
  if (progress >= 1) return target
  const start = Math.atan2(position[1] - center[1], position[0] - center[0])
  const end = Math.atan2(target[1] - center[1], target[0] - center[0])
  let sweep = Math.atan2(Math.sin(end - start), Math.cos(end - start))
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
  order: readonly RingControl[] = controlOrder
) {
  const angle = endAngle(order) - rotation
  return {
    center,
    target: [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius
    ] as Point
  }
}
export const controlRadius = 184
export const sliderLength = 104

function angularStep(count: number): number {
  // Sparse tool sets occupy a shorter arc, rather than opposing ends of a
  // diameter. Five or more tools fill the usual tilted semicircle.
  return Math.PI / Math.max(4, count - 1)
}

function endAngle(order: readonly RingControl[]): number {
  // Keep the +/− end anchored as the ring expands. Without a toggle, center
  // sparse tool sets on the usual short arc.
  return order.includes('more')
    ? (3 * Math.PI) / 4
    : Math.PI / 4 +
        (angularStep(order.length) * Math.max(0, order.length - 1)) / 2
}

export function radiusForSize(
  diameter: number,
  count: number = controlOrder.length
): number {
  // Retain a visible curve for small sets, and leave room for 42px touch
  // controls using the same angular spacing as the layout.
  const minimum = Math.max(72, 22 / Math.sin(angularStep(count) / 2))
  // Keep adjacent buttons at most 56px apart, even on a large map. Sparse
  // rings retain their curve without spreading a few tools across the map.
  const compact = 28 / Math.sin(angularStep(count) / 2)
  return Math.max(minimum, Math.min(controlRadius, compact, diameter * 0.3))
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
  values: { opacity: number; hue: number },
  radius = controlRadius,
  order: readonly RingControl[] = controlOrder
): Record<RingControl, ControlPosition> {
  const step = angularStep(order.length)
  const span = step * Math.max(0, order.length - 1)
  const layout = Object.fromEntries(
    order.map((kind, index) => {
      // Screen Y points down; map rotation is counterclockwise in world space.
      const angle = endAngle(order) - span + index * step - rotation
      const at = (radius: number): Point => [
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius
      ]
      const isSlider = kind === 'opacity' || kind === 'hue'
      // Opacity increases inward; hue keeps its outward color scale.
      const value = kind === 'opacity' ? 1 - values.opacity : values.hue
      return [
        kind,
        {
          position: at(radius + (isSlider ? value * sliderLength : 0)),
          ...(isSlider
            ? {
                rail: {
                  start: at(radius + (kind === 'opacity' ? sliderLength : 0)),
                  end: at(radius + (kind === 'opacity' ? 0 : sliderLength))
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

// Move the entire arc together so a narrow visible part near an edge still
// provides usable controls. Include full rails, so adjusting a slider cannot
// move the arc. Keep each button in place relative to the other controls.
export function fitControlCenter(
  center: Point,
  layout: Record<RingControl, ControlPosition>,
  viewport: Point
): Point {
  const positions = Object.values(layout).flatMap((control) => {
    return control.rail
      ? [control.rail.start, control.rail.end]
      : [control.position]
  })
  if (!positions.length) return center
  return center.map((value, axis) => {
    const minimum = Math.min(...positions.map((p) => p[axis]))
    const maximum = Math.max(...positions.map((p) => p[axis]))
    const lower = (axis === 1 ? (viewport[0] <= 440 ? 110 : 70) : 24) - minimum
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
