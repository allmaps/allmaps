import { createGrid, interpolatePolygon } from './helper_functions.js'

import classifyPoint from 'robust-point-in-polygon'
import * as poly2tri from 'poly2tri'
import type { SVGPolygon, Position } from '@allmaps/types'

// use this function to access the ritch poly2tri triangulaiton output (information on constrained edges, neighbours, interiour, ...)
export function triangulate_poly2tri(polygon: SVGPolygon, distance: number) {
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

// use this function to get an array of triangles
// returns [[[t1x1, t1y1], [t1x2, t1y2], [t1x3, t1y3]], [[t2x1, t2y1], [t2x2, t2y2], [t2x3, t2y3]], ...]
export function triangulate(polygon: SVGPolygon, distance: number) {
  return triangulate_poly2tri(polygon, distance).map((t) =>
    t.getPoints().map((p) => [p.x, p.y])
  )
}
