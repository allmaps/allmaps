const radians = Math.PI / 180
export const bearingSnapTolerance = 4 * radians

/** Find the nearest equivalent angle without jumping across a full turn. */
export function nearestRotation(rotation: number, target: number): number {
  return (
    rotation +
    Math.atan2(Math.sin(target - rotation), Math.cos(target - rotation))
  )
}

/** A configured angle grid takes priority over bearing attraction. Otherwise,
 * keep natural bearing snapping and the temporary 15-degree Shift grid.
 * The caller applies the resulting delta rigidly to the whole selection. */
export function snapRotation(
  rotation: number,
  bearing: number,
  stepped = false,
  stepDegrees?: number
): number {
  if (
    stepDegrees !== undefined &&
    Number.isFinite(stepDegrees) &&
    stepDegrees > 0 &&
    stepDegrees <= 360
  ) {
    const turn = 2 * Math.PI
    const step = stepDegrees * radians
    const wrapped = ((rotation % turn) + turn) % turn
    const lower = Math.floor(wrapped / step) * step
    // Include zero at the seam even when the step does not divide 360.
    const upper = Math.min(turn, lower + step)
    const target = wrapped - lower < upper - wrapped ? lower : upper
    return nearestRotation(rotation, target)
  }
  const aligned = nearestRotation(rotation, bearing)
  if (Math.abs(aligned - rotation) <= bearingSnapTolerance) return aligned
  return stepped
    ? Math.round(rotation / (15 * radians)) * 15 * radians
    : rotation
}
