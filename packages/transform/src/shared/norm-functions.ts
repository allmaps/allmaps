import type { Point } from '@allmaps/types'

export function euclideanNorm(point0: Point, point1: Point): number {
  const dx = point1[0] - point0[0]
  const dy = point1[1] - point0[1]
  return Math.sqrt(dx * dx + dy * dy)
}
