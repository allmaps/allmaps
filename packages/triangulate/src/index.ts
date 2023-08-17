import { createGrid, interpolatePolygon } from './shared.js'

import classifyPoint from 'robust-point-in-polygon'
import * as poly2tri from 'poly2tri'
import type { SVGPolygon, Position } from '@allmaps/types'

/**
 * Triangle as `[[x0, y0], [x1, y1], [x2, y2]]`
 * @typedef {Object} Triangle
 */

/**
 * Triangle object from [poly2tri](https://github.com/r3mi/poly2tri.js/) package
 * @typedef {Object} poly2tri.Triangle
 */

/**
 * Polygon object as `[[number, number], ...]`
 * @typedef {Object} SVGPolygon
 */

/**
 * Triangulates a polygon (and returns the full Poly2tri output)
 *
 * @remark Use this function to access the ritch poly2tri triangulation output (information on constrained edges, neighbours, interiour, ...).
 *
 * @param {SVGPolygon} polygon - Polygon
 * @param {number} distance - Distance between the Steiner points placed in a grid inside the polygon
 * @returns {poly2tri.Triangle[]} Array of triangles partitionning the polygon
 */
export function triangulatePoly2tri(polygon: SVGPolygon, distance: number) {
  // create grid
  const grid: Position[] = createGrid(polygon, distance)

  // initialise Constrained Delaunay Triangulation with polygon
  const swctx = new poly2tri.SweepContext(
    interpolatePolygon(polygon, distance).map(
      (p) => new poly2tri.Point(p[0], p[1])
    )
  )

  // add grid points as Steiner points if they are inside the polygon
  for (let i = 0; i < grid.length; i++) {
    if (classifyPoint(polygon, grid[i]) == -1) {
      swctx.addPoint(new poly2tri.Point(grid[i][0], grid[i][1]))
    }
  }
  // triangulate
  swctx.triangulate()

  return swctx.getTriangles()
}

/**
 * Triangulates a polygon
 *
 * @remark Polygons with < 3 points just return an empty array.
 *
 * @param {SVGPolygon} polygon - Polygon
 * @param {number} distance - Distance between the Steiner points placed in a grid inside the polygon
 * @returns {Triangle[]} Array of triangles partitionning the polygon
 */
export function triangulate(polygon: SVGPolygon, distance: number) {
  return triangulatePoly2tri(polygon, distance).map((t) =>
    t.getPoints().map((p) => [p.x, p.y])
  )
}
