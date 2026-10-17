import type { Point } from '@allmaps/types'
import { bounds } from './geometry.ts'

export const snapSettingsKey = 'allmaps-collage-snapping'
export const snapUnits = { m: 1, km: 1000, ft: 0.3048 }
export type SnapUnit = keyof typeof snapUnits
export type AxisGuide = { origin: Point; axis?: 0 | 1 | 'both' }
export type MoveSnapper = ((delta: Point) => Point) & { guide?: AxisGuide }
export type SnapSettings = {
  mask: boolean
  grid: boolean
  axes: boolean
  rotation: boolean
  rotationStep: number
  spacing: number
  unit: SnapUnit
}

export function defaultSnapSettings(): SnapSettings {
  return {
    mask: true,
    grid: false,
    axes: false,
    rotation: false,
    rotationStep: 15,
    spacing: 100,
    unit: 'm'
  }
}

export function parseSnapSettings(value: unknown): SnapSettings {
  const defaults = defaultSnapSettings()
  if (!value || typeof value !== 'object') return defaults
  const input = value as Partial<SnapSettings>
  const unit =
    typeof input.unit === 'string' && Object.hasOwn(snapUnits, input.unit)
      ? input.unit
      : defaults.unit
  const spacing =
    typeof input.spacing === 'number' &&
    Number.isFinite(input.spacing) &&
    input.spacing >= 0.001 &&
    input.spacing * snapUnits[unit] <= 100_000_000
      ? input.spacing
      : defaults.spacing
  return {
    mask: typeof input.mask === 'boolean' ? input.mask : defaults.mask,
    grid: input.grid === true,
    axes: input.axes === true,
    rotation: input.rotation === true,
    rotationStep:
      typeof input.rotationStep === 'number' &&
      Number.isFinite(input.rotationStep) &&
      input.rotationStep >= 0.1 &&
      input.rotationStep <= 360
        ? input.rotationStep
        : defaults.rotationStep,
    spacing,
    unit
  }
}

/** Capture the original bounds once. One translation keeps every selected map
 * and the spaces between them intact, including while dragging a duplicate.
 * Coordinates are Collage ground metres, before its MapLibre canvas scaling.
 * The canvas stays north-up, so these axes are also horizontal and vertical.
 */
export function createMoveSnapper(
  points: Point[],
  settings: SnapSettings,
  metersPerPixel: number
): MoveSnapper {
  const { grid, axes, spacing, unit } = parseSnapSettings(settings)
  if (!grid && !axes) return (delta) => delta
  const [left, bottom, right, top] = bounds(points)
  const anchor: Point = [(left + right) / 2, (bottom + top) / 2]
  const interval = spacing * snapUnits[unit]
  let axis: AxisGuide['axis']
  const snap: MoveSnapper = (delta) => {
    const distance = Math.hypot(...delta)
    // At the intersection, snap to the exact starting position even if it is
    // off-grid. The wider release radius keeps the two guides from flickering.
    if (axes && distance <= (axis === 'both' ? 12 : 8) * metersPerPixel) {
      axis = 'both'
      snap.guide = { origin: anchor, axis }
      return [0, 0]
    }
    // Selecting an off-grid map, or returning to the drag origin, must not
    // change its placement. Use CSS pixels so this works at every zoom level.
    if (distance < 3 * metersPerPixel) {
      axis = undefined
      if (axes) snap.guide = { origin: anchor }
      return [0, 0]
    }
    if (axes) {
      const nearest = Math.abs(delta[0]) >= Math.abs(delta[1]) ? 0 : 1
      const retained = axis === nearest
      const tolerance = (retained ? 12 : 8) * metersPerPixel
      const angle = ((retained ? 15 : 10) * Math.PI) / 180
      axis =
        Math.abs(delta[1 - nearest]) <=
        Math.min(tolerance, Math.abs(delta[nearest]) * Math.tan(angle))
          ? nearest
          : undefined
      snap.guide = { origin: anchor, axis }
    }
    return delta.map((distance, index) => {
      // An axis snap takes precedence over the perpendicular grid coordinate:
      // an off-grid map still travels along an exact straight line.
      if (axis !== undefined && index !== axis) return 0
      return grid
        ? Math.round((anchor[index] + distance) / interval) * interval -
            anchor[index]
        : distance
    }) as Point
  }
  if (axes) snap.guide = { origin: anchor }
  return snap
}
