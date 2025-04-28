import { Ring, Polygon, Line, Point } from '@allmaps/types'
import { conformPolygon, isEqualPoint } from './geometry.js'
import { arrayDifference, arrayUnique } from './main.js'

const EPSILON = 0

type IntersectionOptions = {
  reportVertexOnVertex: boolean
  reportVertexOnEdge: boolean
  epsilon: number
}

// Find self-intersections in ring
// From https://github.com/mclaeysb/geojson-polygon-self-intersections
export function polygonSelfIntersectionPoints(
  polygon: Polygon,
  options?: Partial<IntersectionOptions>
): Point[] {
  const intersectionPoints: Point[] = []

  polygon = conformPolygon(polygon)
  polygon = polygon.map((ring: Ring) => [...ring, ring[0]])

  for (let ringIndex0 = 0; ringIndex0 < polygon.length; ringIndex0++) {
    for (
      let lineIndex0 = 0;
      lineIndex0 < polygon[ringIndex0].length - 1;
      lineIndex0++
    ) {
      for (
        let ringIndex1 = ringIndex0;
        ringIndex1 < polygon.length;
        ringIndex1++
      ) {
        for (
          let lineIndex1 = lineIndex0 + 1;
          lineIndex1 < polygon[ringIndex1].length - 1;
          lineIndex1++
        ) {
          const line0 = [
            polygon[ringIndex0][lineIndex0],
            polygon[ringIndex0][lineIndex0 + 1]
          ] as Line
          const line1 = [
            polygon[ringIndex1][lineIndex1],
            polygon[ringIndex1][lineIndex1 + 1]
          ] as Line

          const intersectionPoint = linesIntersectionPoint(
            line0,
            line1,
            options
          )

          if (intersectionPoint) {
            intersectionPoints.push(intersectionPoint)
          }
        }
      }
    }
  }

  const selfIntersectionPoints = arrayDifference(
    intersectionPoints,
    polygon.flat(),
    isEqualPoint
  )

  return arrayUnique(selfIntersectionPoints, isEqualPoint)
}

export function linesIntersectionPoint(
  line0: Line,
  line1: Line,
  options?: Partial<IntersectionOptions>
): Point | undefined {
  options = {
    reportVertexOnVertex: false,
    reportVertexOnEdge: false,
    ...options
  }

  const intersectionPoint = prolongedLinesIntersectionPoint(line0, line1)

  if (intersectionPoint === undefined) return undefined // discard parallels and coincidence
  let frac0, frac1
  if (line0[1][0] != line0[0][0]) {
    frac0 = (intersectionPoint[0] - line0[0][0]) / (line0[1][0] - line0[0][0])
  } else {
    frac0 = (intersectionPoint[1] - line0[0][1]) / (line0[1][1] - line0[0][1])
  }
  if (line1[1][0] != line1[0][0]) {
    frac1 = (intersectionPoint[0] - line1[0][0]) / (line1[1][0] - line1[0][0])
  } else {
    frac1 = (intersectionPoint[1] - line1[0][1]) / (line1[1][1] - line1[0][1])
  }

  // There are roughly three cases we need to deal with.
  // 1. If at least one of the fracs lies outside [0,1], there is no intersection.
  if (isOutside(frac0, options.epsilon) || isOutside(frac1, options.epsilon)) {
    return undefined
  }

  // 2. If both are either exactly 0 or exactly 1, this is not an intersection but just
  // two edge segments sharing a common vertex.
  if (
    options.reportVertexOnVertex &&
    isBoundaryCase(frac0, options.epsilon) &&
    isBoundaryCase(frac1, options.epsilon)
  ) {
    return intersectionPoint
  }

  // 3. If only one of the fractions is exactly 0 or 1, this is
  // a vertex-on-edge situation.
  if (
    options.reportVertexOnEdge &&
    (isBoundaryCase(frac0, options.epsilon) ||
      isBoundaryCase(frac1, options.epsilon))
  ) {
    return intersectionPoint
  }

  return intersectionPoint
}

// Function to compute where two prolonged lines intersect. From https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
export function prolongedLinesIntersectionPoint(
  line0: Line,
  line1: Line
): Point | undefined {
  const denom =
    (line0[0][0] - line0[1][0]) * (line1[0][1] - line1[1][1]) -
    (line0[0][1] - line0[1][1]) * (line1[0][0] - line1[1][0])
  if (denom === 0) return undefined

  const x =
    ((line0[0][0] * line0[1][1] - line0[0][1] * line0[1][0]) *
      (line1[0][0] - line1[1][0]) -
      (line0[0][0] - line0[1][0]) *
        (line1[0][0] * line1[1][1] - line1[0][1] * line1[1][0])) /
    denom

  const y =
    ((line0[0][0] * line0[1][1] - line0[0][1] * line0[1][0]) *
      (line1[0][1] - line1[1][1]) -
      (line0[0][1] - line0[1][1]) *
        (line1[0][0] * line1[1][1] - line1[0][1] * line1[1][0])) /
    denom
  return [x, y]
}

// true if fraction is (almost) 0.0 or 1.0
function isBoundaryCase(fraction: number, epsilon?: number) {
  epsilon = epsilon || EPSILON
  const e2 = epsilon * epsilon
  return e2 >= (fraction - 1) * (fraction - 1) || e2 >= fraction * fraction
}

// true if fraction is outside [0.0, 1.0] more then epsilon
function isOutside(fraction: number, epsilon?: number) {
  epsilon = epsilon || EPSILON
  return fraction < 0 - epsilon || fraction > 1 + epsilon
}
