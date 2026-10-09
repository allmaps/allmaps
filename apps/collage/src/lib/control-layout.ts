import type { Point } from '@allmaps/types'

// Equal angular intervals on a semicircle tilted 45 degrees from vertical.
export const controlOrder = [
  'remove',
  'front',
  'duplicate',
  'background',
  'saturation',
  'hue',
  'opacity',
  'mask',
  'editMask',
  'move',
  'rotate'
] as const
export type Control = (typeof controlOrder)[number]
export type Slider = 'opacity' | 'hue'
export type Rail = { start: Point; end: Point }
export type ControlPosition = { position: Point; rail?: Rail }
export const controlRadius = 184
export const sliderLength = 104
export function radiusForSize(diameter: number): number {
  return Math.max(140, Math.min(controlRadius, diameter * 0.3))
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
  radius = controlRadius
): Record<Control, ControlPosition> {
  const layout = Object.fromEntries(
    controlOrder.map((kind, index) => {
      // Screen Y points down; map rotation is counterclockwise in world space.
      const angle =
        -Math.PI / 4 + (index * Math.PI) / (controlOrder.length - 1) - rotation
      const at = (radius: number): Point => [
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius
      ]
      const isSlider = kind === 'opacity' || kind === 'hue'
      return [
        kind,
        {
          position: at(radius + (isSlider ? values[kind] * sliderLength : 0)),
          ...(isSlider
            ? {
                rail: {
                  start: at(radius),
                  end: at(radius + sliderLength)
                }
              }
            : {})
        }
      ]
    })
  ) as Record<Control, ControlPosition>
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
  layout: Record<Control, ControlPosition>,
  viewport: Point
): Point {
  const positions = controlOrder.flatMap((key) => {
    const control = layout[key]
    return control.rail
      ? [control.rail.start, control.rail.end]
      : [control.position]
  })
  return center.map((value, axis) => {
    const minimum = Math.min(...positions.map((p) => p[axis]))
    const maximum = Math.max(...positions.map((p) => p[axis]))
    const lower = (axis === 1 ? 70 : 24) - minimum
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
