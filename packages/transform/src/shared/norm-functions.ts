import type { Position } from './types.js'

export function euclideanNorm(point1: Position, point2: Position): number {
  const sub = [point2[0] - point1[0], point2[1] - point1[1]]
  const norm = Math.sqrt(sub[0] ** 2 + sub[1] ** 2)
  return norm
}
