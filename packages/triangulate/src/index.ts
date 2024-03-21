import { createGrid, makePointsOnRing } from './shared.js'

import classifyPoint from 'robust-point-in-polygon'
import * as poly2tri from 'poly2tri'
import type {
  Point,
  Ring,
  Triangle,
  UniquePointsIndexTriangle
} from '@allmaps/types'

type PointLike = { x: number; y: number; type: string; item: number }
type PointLikeTriangle = [PointLike, PointLike, PointLike]

/**
 * Triangle object from [poly2tri](https://github.com/r3mi/poly2tri.js/) package
 * @typedef {Object} poly2tri.Triangle
 */

/**
 * Triangulates a polygon (and returns the full Poly2tri output)
 *
 * @remark Use this function to access the rich poly2tri triangulation output (information on constrained edges, neighbours, interior).
 *
 * @param {Ring} polygon - Polygon
 * @param {number} distance - Distance between the Steiner points placed in a grid inside the polygon
 * @returns {poly2tri.Triangle[]} Array of triangles partitioning the polygon
 */
export function triangulatePoly2tri(polygon: Ring, distance: number) {
  let item = 0

  // Initialize Constrained Delaunay Triangulation with polygon
  const swctx = new poly2tri.SweepContext(
    makePointsOnRing(polygon, distance).map((p) => {
      return { x: p[0], y: p[1], type: 'p', item: item++ }
    })
  )

  // Add grid points as Steiner points if they are inside the polygon
  swctx.addPoints(
    createGrid(polygon, distance)
      .filter((p) => classifyPoint(polygon, p) === -1)
      .map((p) => {
        return {
          x: p[0],
          y: p[1],
          type: 'g',
          item: item++
        }
      })
  )

  // Triangulate
  try {
    swctx.triangulate()
  } catch (e) {
    // This is a poly2tri PointError. Check e.message and e.points for more information.
    throw new Error(
      'A Point Error occured during resource mask triangulation. This is typically because the resource mask contains duplicate or collinear points, or is self-intersecting.'
    )
  }
  return swctx.getTriangles()
}

/**
 * Triangulates a polygon
 *
 * @remark Polygons with < 3 points just return an empty array.
 *
 * @param {Ring} polygon - Polygon
 * @param {number} distance - Distance between the Steiner points placed in a grid inside the polygon
 * @returns {Triangle[]} Array of triangles partitioning the polygon
 */
export function triangulate(polygon: Ring, distance: number): Triangle[] {
  return triangulatePoly2tri(polygon, distance).map(
    (t) => t.getPoints().map((p) => [p.x, p.y]) as Triangle
  )
}

/**
 * Triangulates a polygon and return unique points.
 * Grid points typically occure in 6 triangles
 * This function reutrns the list of unique points, and returns the triangles as uniquePointsIndexTriangles with indices refering to the unique points
 *
 * @remark Polygons with < 3 points just return an empty array.
 *
 * @param {Ring} polygon - Polygon
 * @param {number} distance - Distance between the Steiner points placed in a grid inside the polygon
 * @returns {{uniquePointsIndexTriangles: UniquePointsIndexTriangle[], uniquePoints: Point[]}} Object with uniquePointsIndexTriangles and uniquePoints
 */
export function triangulateToUnique(
  polygon: Ring,
  distance: number
): {
  uniquePointsIndexTriangles: UniquePointsIndexTriangle[]
  uniquePoints: Point[]
} {
  const pointLikeTriangles = triangulatePoly2tri(polygon, distance).map((t) =>
    t.getPoints().map((p) => p as PointLike)
  ) as PointLikeTriangle[]

  const pointLikesByItem = new Map(
    pointLikeTriangles.flat().map((pl) => [pl.item, pl]) as [
      number,
      PointLike
    ][]
  )
  const uniquePointLikes = [...pointLikesByItem.values()].sort(
    (pl0, pl1) => pl0.item - pl1.item
  )

  const uniquePoints = uniquePointLikes.map((pl) => [pl.x, pl.y] as Point)
  const uniquePointsIndexTriangles = pointLikeTriangles.map((t) =>
    t.map((pl) => pl.item as number)
  ) as UniquePointsIndexTriangle[]

  return {
    uniquePointsIndexTriangles,
    uniquePoints
  }
}
