import Delaunator from 'delaunator'
import Constrainautor from '@kninnug/constrainautor'

import {
  computeBbox,
  conformPolygon,
  mergeOptions,
  midPoint,
  triangleAngles
} from '@allmaps/stdlib'
import type {
  Point,
  Polygon,
  Triangle,
  TypedLine,
  TypedPolygon,
  TypedTriangle
} from '@allmaps/types'

import {
  getGridPointsInBbox,
  interpolateRing,
  interpolatePolygon,
  pointInPolygon
} from './shared.js'

import type { TriangluationOptions, TriangulationToUnique } from './types.js'

const MINIMUM_TRIANGLE_ANGLE = 0.0001

const defaultTriangulationOptions = {
  steinerPoints: [],
  steinerPolygons: [],
  minimumTriangleAngle: MINIMUM_TRIANGLE_ANGLE,
  computeInsideSteinerPolygons: false
} as TriangluationOptions

export { interpolateRing, interpolatePolygon }

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
 * @param partialOptions - Triangulation Options.
 * @returns Triangulation Object with uniquePointIndexTriangles and uniquePoints
 */
export function triangulateToUnique(
  polygon: Polygon,
  distance?: number,
  partialOptions?: Partial<TriangluationOptions>
): TriangulationToUnique {
  const options = mergeOptions(defaultTriangulationOptions, partialOptions)

  // Conform polygons (this also checks if there are at least 3 points)
  polygon = conformPolygon(polygon)
  const steinerPolygons = options.steinerPolygons.map((steinerPolygon) =>
    conformPolygon(steinerPolygon)
  )

  // Gather Steinerpoints (don't require them to be in polygon)
  const steinerPointsInPolygon = options.steinerPoints

  // Interpolate polygons and create grid based on distance
  let interpolatedPolygon: Polygon = []
  let interpolatedPolygonPoints: Point[] = []
  let interpolatedSteinerPolygons: Polygon[] = []
  let interpolatedSteinerPolygonsPoints: Point[] = []
  let gridPoints: Point[] = []
  let gridPointsInPolygon: Point[] = []
  if (distance) {
    // Interpolate polygon
    interpolatedPolygon = interpolatePolygon(polygon, distance)

    // Interpolate Steiner Polygons
    interpolatedSteinerPolygons = steinerPolygons.map((steinerPolygon) =>
      interpolatePolygon(steinerPolygon, distance)
    )

    // Add grid points inside the polygon
    gridPoints = getGridPointsInBbox(computeBbox(polygon), distance)
    gridPointsInPolygon = gridPoints.filter((point) =>
      pointInPolygon(point, polygon)
    )
  } else {
    interpolatedPolygon = polygon
    interpolatedSteinerPolygons = steinerPolygons
  }

  interpolatedPolygonPoints = interpolatedPolygon.flat()
  interpolatedSteinerPolygonsPoints = interpolatedSteinerPolygons.flat(2)

  // Gather all points and deduplicate to keep only unique points
  // with map from points to their index in uniquePoints, and index getter
  const allPoints = [
    ...interpolatedPolygonPoints,
    ...gridPointsInPolygon,
    ...interpolatedSteinerPolygonsPoints,
    ...steinerPointsInPolygon
  ]
  const uniquePoints = []
  const uniquePointIndexByPointString = new Map<string, number>()
  for (const point of allPoints) {
    const key = `${point[0]},${point[1]}`
    if (!uniquePointIndexByPointString.has(key)) {
      uniquePointIndexByPointString.set(key, uniquePoints.length)
      uniquePoints.push(point)
    }
  }
  const getPointIndex = ([x, y]: Point): number => {
    const index = uniquePointIndexByPointString.get(`${x},${y}`)
    if (index === undefined)
      throw new Error(`Point not found in uniquePoints: [${x}, ${y}]`)
    return index
  }

  // Lookup point indices for the edges of the interpolated polygon
  const uniquePointIndexInterpolatedPolygon: TypedPolygon<number> =
    interpolatedPolygon.map((ring) => ring.map(getPointIndex))
  // Lookup point indices for the edges of the interpolated steiner polygons
  const uniquePointIndexInterpolatedSteinerPolygons: TypedPolygon<number>[] =
    interpolatedSteinerPolygons.map((polygon) =>
      polygon.map((ring) => ring.map(getPointIndex))
    )

  // Gather all constrained edges
  // TODO: consider to make unique, but this could be very expensive and low chance of non-uniquess
  const uniquePointIndexEdges: TypedLine<number>[] = [
    ...uniquePointIndexInterpolatedPolygon,
    ...uniquePointIndexInterpolatedSteinerPolygons.flat()
  ].flatMap((ring: number[]): TypedLine<number>[] =>
    ring.map((uniquePointIndex, i) => [
      uniquePointIndex,
      ring[(i + 1) % ring.length]
    ])
  )

  // Initialize Delaunay triangulation
  const delautator = new Delaunator(uniquePoints.flat())

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

  // Only keep triangles inside polygon
  const shouldKeep = triangles.map((triangle, index) => {
    // Only keep if inside
    if (shouldClassifyTriangles[index]) {
      return (
        pointInPolygon(midPoint(...triangle), polygon) &&
        triangleAngles(triangle).every(
          (angle) => angle >= options.minimumTriangleAngle
        )
      )
    } else {
      return true
    }
  })
  uniquePointIndexTriangles = uniquePointIndexTriangles.filter(
    (_triangle, index) => shouldKeep[index]
  )
  triangles = triangles.filter((_triangle, index) => shouldKeep[index])

  // If requested, compute if triangles are inside steiner polygons
  let insideSteinerPolygonsTriangles: boolean[] = []
  if (options.computeInsideSteinerPolygons) {
    insideSteinerPolygonsTriangles = triangles.map((triangle) =>
      steinerPolygons.some((steinerPolygon) =>
        pointInPolygon(midPoint(...triangle), steinerPolygon)
      )
    )
  }

  return {
    interpolatedPolygon,
    interpolatedPolygonPoints,
    gridPoints,
    gridPointsInPolygon,
    interpolatedSteinerPolygons,
    interpolatedSteinerPolygonsPoints,
    uniquePoints,
    triangles,
    uniquePointIndexTriangles,
    uniquePointIndexInterpolatedPolygon,
    uniquePointIndexEdges,
    uniquePointIndexInterpolatedSteinerPolygons,
    insideSteinerPolygonsTriangles
  }
}
