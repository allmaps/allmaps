import type { Point } from '@allmaps/types'

export function euclideanNorm(point0: Point, point1: Point): number {
  const sub = [point1[0] - point0[0], point1[1] - point0[1]]
  const norm = Math.sqrt(sub[0] ** 2 + sub[1] ** 2)
  return norm
}
