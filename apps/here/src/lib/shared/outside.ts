import { distance } from '@allmaps/stdlib'

import type { Point, Line, Ring } from '@allmaps/types'

export function lineBearing(from: Point, to: Point): number {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]

  // Angle in radians
  const angle = Math.atan2(dy, dx)

  // Convert to degrees and normalize to [0, 360)
  const bearing = (angle * 180) / Math.PI
  return (bearing + 360) % 360
}

export function pointOnPolygon(from: Point, to: Point, polygon: Ring) {
  // Check if polygon has points
  if (!polygon.length) {
    return null
  }

  const intersections: Point[] = []

  // Find the intersection of the line with each edge of the polygon
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    const edge: Line = [polygon[i], polygon[j]]

    const intersection = lineIntersection([from, to], edge)

    if (intersection) {
      intersections.push(intersection)
    }
  }

  if (intersections.length > 0) {
    const intersectionsSorted = intersections.toSorted(
      (a, b) => distance(from, a) - distance(from, b)
    )

    return intersectionsSorted[0]
  }

  return null
}

/**
 * Check if two line segments intersect and return the intersection point
 */
function lineIntersection(line1: Line, line2: Line): Point | null {
  const [x1, y1] = line1[0]
  const [x2, y2] = line1[1]
  const [x3, y3] = line2[0]
  const [x4, y4] = line2[1]

  // Calculate determinants
  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)

  // Lines are parallel when denominator is zero
  if (denominator === 0) {
    return null
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

  // Intersection point must be within both line segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return null
  }

  // Calculate the intersection point
  const x = x1 + ua * (x2 - x1)
  const y = y1 + ua * (y2 - y1)

  return [x, y] as Point
}
