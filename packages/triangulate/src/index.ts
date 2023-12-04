import { createGrid, makePointsOnPolygon } from './shared.js'

import classifyPoint from 'robust-point-in-polygon'
import * as poly2tri from 'poly2tri'
import type { Ring, Point, Triangle } from '@allmaps/types'

/**
 * Triangle as `[[x0, y0], [x1, y1], [x2, y2]]`
 * @typedef {Object} Triangle
 */

/**
 * Triangle object from [poly2tri](https://github.com/r3mi/poly2tri.js/) package
 * @typedef {Object} poly2tri.Triangle
 */

/**
 * Polygon object, as an outer Ring only `[[number, number], ...]`
 * @typedef {Object} Ring
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
  // create grid
  const grid: Point[] = createGrid(polygon, distance)

  // Initialize Constrained Delaunay Triangulation with polygon
  const swctx = new poly2tri.SweepContext(
    makePointsOnPolygon(polygon, distance).map(
      (p) => new poly2tri.Point(p[0], p[1])
    )
  )

  // Add grid points as Steiner points if they are inside the polygon
  for (let i = 0; i < grid.length; i++) {
    if (classifyPoint(polygon, grid[i]) === -1) {
      swctx.addPoint(new poly2tri.Point(grid[i][0], grid[i][1]))
    }
  }
  // triangulate

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
