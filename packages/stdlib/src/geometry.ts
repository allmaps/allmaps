import type { Position } from '@allmaps/types'

export function isEqualPosition(
  position1: Position,
  position2: Position
): boolean {
  if (position1 === position2) return true
  if (position1 == null || position2 == null) return false

  return position1[0] == position2[0] && position1[1] == position2[1]
}

export function isEqualPositionArray(
  positionArray1: Position[],
  positionArray2: Position[]
): boolean {
  if (positionArray1 === positionArray2) return true
  if (positionArray1 == null || positionArray2 == null) return false
  if (positionArray1.length !== positionArray2.length) return false

  for (let i = 0; i < positionArray1.length; ++i) {
    if (isEqualPosition(positionArray1[i], positionArray2[i])) return false
  }
  return true
}

export function isEqualPositionArrayArray(
  positionArrayArray1: Position[][],
  positionArrayArray2: Position[][]
): boolean {
  if (positionArrayArray1 === positionArrayArray2) return true
  if (positionArrayArray1 == null || positionArrayArray2 == null) return false
  if (positionArrayArray1.length !== positionArrayArray2.length) return false

  for (let i = 0; i < positionArrayArray1.length; ++i) {
    if (isEqualPositionArray(positionArrayArray1[i], positionArrayArray2[i]))
      return false
  }
  return true
}

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
