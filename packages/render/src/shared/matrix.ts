import type { Transform, Position } from './types.js'

export function applyTransform(transform: Transform, coordinate: Position) {
  const x = coordinate[0]
  const y = coordinate[1]
  coordinate[0] = transform[0] * x + transform[2] * y + transform[4]
  coordinate[1] = transform[1] * x + transform[3] * y + transform[5]
  return coordinate
}
