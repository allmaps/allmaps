const radians = Math.PI / 180
export const bearingSnapTolerance = 4 * radians

/** Find the nearest equivalent angle without jumping across a full turn. */
export function nearestRotation(rotation: number, target: number): number {
  return (
    rotation +
    Math.atan2(Math.sin(target - rotation), Math.cos(target - rotation))
  )
}

/** Natural bearing takes priority near the target; Shift retains the existing
 * 15-degree grid elsewhere. The caller applies the resulting delta rigidly. */
export function snapRotation(
  rotation: number,
  bearing: number,
  stepped = false
): number {
  const aligned = nearestRotation(rotation, bearing)
  if (Math.abs(aligned - rotation) <= bearingSnapTolerance) return aligned
  return stepped
    ? Math.round(rotation / (15 * radians)) * 15 * radians
    : rotation
}
