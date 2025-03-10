import {
  getGridPointsInBbox,
  interpolatePolygon,
  pointInPolygon
} from './shared.js'
import {
  computeBbox,
  conformPolygon,
  mergeOptions,
  midPoint,
  triangleAngles
} from '@allmaps/stdlib'

import Delaunator from 'delaunator'

// @ts-expect-error Ignore missing types
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

const MINIMUM_TRIANGLE_ANGLE = 0.0001

export type TriangluationOptions = {
  steinerPoints: Point[]
  minimumTriangleAngle: number
}

const defaultTriangulationOptions = {
  steinerPoints: [],
  minimumTriangleAngle: MINIMUM_TRIANGLE_ANGLE
} as TriangluationOptions

/**
 * Triangulate a polygon to triangles smaller then a distance
 *
 * Grid points are placed inside the polygon to obtain small, well conditioned triangles.
 *
 * @param polygon - Polygon
 * @param distance - Distance that conditions the triangles
 * @param triangulationOptions - Triangulation Options.
 * @returns Array of triangles partitioning the polygon
 */
export function triangulate(
  polygon: Polygon,
  distance?: number,
  triangulationOptions?: Partial<TriangluationOptions>
): Triangle[] {
  {
    const { triangles } = triangulateToUnique(
      polygon,
      distance,
      triangulationOptions
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
 * @param polygon - Polygon
 * @param distance - Distance that conditions the triangles
 * @param triangulationOptions - Triangulation Options.
 * @returns Triangulation Object with uniquePointIndexTriangles and uniquePoints
 */
export function triangulateToUnique(
  polygon: Polygon,
  distance?: number,
  triangulationOptions?: Partial<TriangluationOptions>
): TriangulationToUnique {
  const mergedTriangulationOptions = mergeOptions(
    defaultTriangulationOptions,
    triangulationOptions
  )
  const steinerPoints = mergedTriangulationOptions.steinerPoints
  const minimumTriangleAngle = mergedTriangulationOptions.minimumTriangleAngle

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
  const steinerPointsInPolygon = steinerPoints.filter((point) =>
    pointInPolygon(point, polygon)
  )
  const uniquePoints = [
    ...interpolatedPolygonPoints,
    ...gridPointsInPolygon,
    ...steinerPointsInPolygon
  ]

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
  // Note: instead of
  // const constrainautor = new Constrainautor(delautator, uniquePointIndexEdges)
  // which gives an error "Constraining edge intersects point" for small distances, e.g. maxDepth 7 on https://gist.githubusercontent.com/sammeltassen/fa3dbfaf4dfa800e00824478c4bd1928/raw/f182beac911e38b0a1d1eb420fbd54b4e6d2f2eb/nl-railway-map.json
  // we perform a delaunify check first as proposed by
  // https://github.com/kninnug/Constrainautor/issues/11#issuecomment-2571296247
  // Keep an eye on proposed solutions, sinche the delaunify check is expensive
  const constrainautor = new Constrainautor(delautator)
  constrainautor.delaunify(true)
  constrainautor.constrainAll(uniquePointIndexEdges)

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
    // Only classify triangles if they are along the border
    shouldClassifyTriangles.push(
      constrainautor.del.triangles[i] < interpolatedPolygonPoints.length ||
        constrainautor.del.triangles[i + 1] <
          interpolatedPolygonPoints.length ||
        constrainautor.del.triangles[i + 2] < interpolatedPolygonPoints.length
    )
  }

  // Check if triangles inside
  const shouldKeep = triangles.map((triangle, index) => {
    // Only keep if inside
    if (shouldClassifyTriangles[index]) {
      return (
        pointInPolygon(midPoint(...triangle), polygon) &&
        triangleAngles(triangle).every((angle) => angle >= minimumTriangleAngle)
      )
    } else {
      return true
    }
  })
  uniquePointIndexTriangles = uniquePointIndexTriangles.filter(
    (_triangle, index) => shouldKeep[index]
  )
  triangles = triangles.filter((_triangle, index) => shouldKeep[index])

  // Fill in edges using unique
  const edges: Line[] = []
  for (let i = 0; i < uniquePointIndexEdges.length; i += 1) {
    edges.push([
      uniquePoints[uniquePointIndexEdges[i][0]],
      uniquePoints[uniquePointIndexEdges[i][1]]
    ])
  }

  return {
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
