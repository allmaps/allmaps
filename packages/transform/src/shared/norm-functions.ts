import type { Point } from '@allmaps/types'

export function euclideanNorm(point1: Point, point2: Point): number {
  const sub = [point2[0] - point1[0], point2[1] - point1[1]]
  const norm = Math.sqrt(sub[0] ** 2 + sub[1] ** 2)
  return norm
}
