import type { Position } from '@allmaps/types'

export function getMidPosition(
  position1: Position,
  position2: Position
): Position {
  return [
    (position2[0] - position1[0]) / 2 + position1[0],
    (position2[1] - position1[1]) / 2 + position1[1]
  ]
}

export function getDistance(from: Position, to: Position): number {
  return Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2)
}
