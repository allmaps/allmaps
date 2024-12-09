import {
  getGridPointsInBbox,
  interpolatePolygon,
  pointInPolygon
} from './shared.js'
import {
  computeBbox,
  conformPolygon,
  midPoint,
  triangleArea
} from '@allmaps/stdlib'

import Delaunator from 'delaunator'
import Constrainautor from '@kninnug/constrainautor'

import type {
  Line,
  Point,
  Polygon,
  Triangle,
  TypedLine,
  TypedPolygon,
  TypedTriangle
} from '@allmaps/types'

export type TriangulationToUnique = {
  constrainautor: Constrainautor
  interpolatedPolygon: Polygon
  interpolatedPolygonPoints: Point[]
  gridPoints: Point[]
  gridPointsInPolygon: Point[]
  uniquePoints: Point[]
  triangles: Triangle[]
  uniquePointIndexTriangles: TypedTriangle<number>[]
  uniquePointIndexInterpolatedPolygon: TypedPolygon<number>
  uniquePointIndexEdges: TypedLine<number>[]
}

const EPSILON = 0.001

/**
 * Triangulate a polygon to triangles smaller then a distance
 *
 * Grid points are placed inside the polygon to obtain small, well conditioned triangles.
 *
 * @param {Polygon} polygon - Polygon
 * @param {number} [distance] - Distance that conditions the triangles
 * @param {number} [minimumTriangleArea] - Minimum area of the resulting triangles (filters out slivers), absolute if no distance provided, relative to distance * distance otherwise
 * @returns {Triangle[]} Array of triangles partitioning the polygon
 */
export function triangulate(
  polygon: Polygon,
  distance?: number,
  minimumTriangleArea = EPSILON
): Triangle[] {
  {
    const { triangles } = triangulateToUnique(
      polygon,
      distance,
      minimumTriangleArea
    )
    return triangles
  }
}

/**
 * Triangulate a polygon to triangles smaller then a distance, and return them via unique points.
 *
 * Grid points are placed inside the polygon to obtain small, well conditioned triangles.
 *
 * This function returns the triangulation as an array of unique points, and triangles of indices refering to those unique points.
 *
 * @param {Polygon} polygon - Polygon
 * @param {number} [distance] - Distance that conditions the triangles
 * @param {number} [minimumTriangleArea] - Minimum area of the resulting triangles (filters out slivers), absolute if no distance provided, relative to distance * distance otherwise
 * @returns {TriangulationToUnique} Triangulation Object with uniquePointIndexTriangles and uniquePoints
 */
export function triangulateToUnique(
  polygon: Polygon,
  distance?: number,
  minimumTriangleArea = EPSILON
): TriangulationToUnique {
  // Conform polygon (this also checks if there are at least 3 points)
  polygon = conformPolygon(polygon)

  let interpolatedPolygon: Polygon = []
  let interpolatedPolygonPoints: Point[] = []
  let gridPoints: Point[] = []
  let gridPointsInPolygon: Point[] = []
  if (distance) {
    // Interpolate polygon
    interpolatedPolygon = interpolatePolygon(polygon, distance)
    interpolatedPolygonPoints = interpolatedPolygon.flat()

    // Add grid points inside the polygon
    gridPoints = getGridPointsInBbox(computeBbox(polygon), distance)
    gridPointsInPolygon = gridPoints.filter((point) =>
      pointInPolygon(point, polygon)
    )
  } else {
    interpolatedPolygon = polygon
    interpolatedPolygonPoints = polygon.flat()
  }
  const uniquePoints = [...interpolatedPolygonPoints, ...gridPointsInPolygon]

  // Initialize Delaunay triangulation from polygon + grid points
  const delautator = new Delaunator(uniquePoints.flat())

  // Collect indices of (interpolated) polygon edges
  let ringOffset = 0
  const uniquePointIndexInterpolatedPolygon: TypedPolygon<number> =
    interpolatedPolygon.map((ring) => {
      const uniqueIndexRing = ring.map((_point, index) => ringOffset + index)
      ringOffset += ring.length
      return uniqueIndexRing
    })
  const uniquePointIndexEdges: TypedLine<number>[] =
    uniquePointIndexInterpolatedPolygon
      .map((ring) =>
        ring.map(
          (uniqueIndex) =>
            [uniqueIndex, (uniqueIndex + 1) % ring.length] as [number, number]
        )
      )
      .flat()

  // Constrain triangulation
  const constrainautor = new Constrainautor(delautator, uniquePointIndexEdges)

  let uniquePointIndexTriangles: TypedTriangle<number>[] = []
  let triangles: Triangle[] = []
  const shouldClassifyTriangles: boolean[] = []
  for (let i = 0; i < constrainautor.del.triangles.length; i += 3) {
    uniquePointIndexTriangles.push([
      constrainautor.del.triangles[i],
      constrainautor.del.triangles[i + 1],
      constrainautor.del.triangles[i + 2]
    ])
    triangles.push([
      uniquePoints[constrainautor.del.triangles[i]],
      uniquePoints[constrainautor.del.triangles[i + 1]],
      uniquePoints[constrainautor.del.triangles[i + 2]]
    ])
    shouldClassifyTriangles.push(
      constrainautor.del.triangles[i] < interpolatedPolygonPoints.length ||
        constrainautor.del.triangles[i + 1] <
          interpolatedPolygonPoints.length ||
        constrainautor.del.triangles[i + 2] < interpolatedPolygonPoints.length
    )
  }

  // Check if triangles inside
  minimumTriangleArea = distance
    ? distance * distance * minimumTriangleArea
    : minimumTriangleArea
  const classifications = triangles.map((triangle, index) => {
    // Only keep if inside
    if (shouldClassifyTriangles[index]) {
      return (
        pointInPolygon(midPoint(...triangle), polygon) &&
        triangleArea(triangle) > minimumTriangleArea
      )
    } else {
      return true
    }
  })
  uniquePointIndexTriangles = uniquePointIndexTriangles.filter(
    (_triangle, index) => classifications[index]
  )
  triangles = triangles.filter((_triangle, index) => classifications[index])

  // Fill in edges using unique
  const edges: Line[] = []
  for (let i = 0; i < uniquePointIndexEdges.length; i += 1) {
    edges.push([
      uniquePoints[uniquePointIndexEdges[i][0]],
      uniquePoints[uniquePointIndexEdges[i][1]]
    ])
  }

  return {
    constrainautor,
    interpolatedPolygon,
    interpolatedPolygonPoints,
    gridPoints,
    gridPointsInPolygon,
    uniquePoints,
    triangles,
    uniquePointIndexTriangles,
    uniquePointIndexInterpolatedPolygon,
    uniquePointIndexEdges
  }
}
