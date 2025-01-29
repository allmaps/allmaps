# @allmaps/triangulate

This module triangulates a polygon: it returns a set of triangles that partition the polygon.

If a `distance` parameter is provided, the triangles are well-conditioned and generally not larger then `distance`: the triangles are made to follow the polygon, who's edges are interpolated every `distance`, and also a grid of points inside the polygon, spaced `distance` apart.

This package is used internally in [@allmaps/render](../../packages/render/) to triangulate the mask of a georeferenced map into a set of triangles that can be rendered with WebGL.

## How it works

It uses a modern **constrained Delaunay triangulation algorithm** for polygons, built using [Delaunator](https://github.com/mapbox/delaunator) and [Contrainautor](https://github.com/kninnug/Constrainautor), and uses [Robust-Point-In-Polygon](https://github.com/mikolalysenko/robust-point-in-polygon/tree/master) to only allow resulting triangles are indeed inside the original polygon.

To learn more on how it works, check out this [Observable notebook](https://observablehq.com/d/efde1d04f1a9bc17).

## Installation

This is an ESM-only module that works in browsers and Node.js.

Install using npm:

```sh
npm install @allmaps/triangulate
```

## Usage

```js
import { triangulate } from '@allmaps/triangulate'

// Note that polygons are in double brackets (an array of an outer ring, and possibly inner rings if there are holes) and their rings are not round-trip (the first coordinate is not repeated at the and)
const polygon = [
  [
    [0.592, 0.953],
    [0.304, 2.394],
    [2.904, 2.201],
    [2.394, 0.232]
  ]
]

const distance = 1

// Compute constrained triangulation of `polygon` using a grid of size `distance`
const triangles = triangulate(polygon, distance)

// triangles = [
//   [
//     [ 1.304, 1.232 ],
//     [ 1.4655588463411926, 0.6034795070965593 ],
//     [ 0.592, 0.953 ]
//   ],
//   ...
// ]
```

## API

### `TriangulationToUnique`

###### Fields

* `gridPoints` (`Array<Point>`)
* `gridPointsInPolygon` (`Array<Point>`)
* `interpolatedPolygon` (`Array<Array<Point>>`)
* `interpolatedPolygonPoints` (`Array<Point>`)
* `triangles` (`Array<Triangle>`)
* `uniquePointIndexEdges` (`Array<TypedLine<number>>`)
* `uniquePointIndexInterpolatedPolygon` (`Array<Array<number>>`)
* `uniquePointIndexTriangles` (`Array<TypedTriangle<number>>`)
* `uniquePoints` (`Array<Point>`)

### `triangulate(polygon, distance, minimumTriangleArea)`

Triangulate a polygon to triangles smaller then a distance

Grid points are placed inside the polygon to obtain small, well conditioned triangles.

###### Parameters

* `polygon` (`Array<Array<Point>>`)
  * Polygon
* `distance?` (`number | undefined`)
  * Distance that conditions the triangles
* `minimumTriangleArea` (`number | undefined`)
  * Minimum area of the resulting triangles (filters out slivers), absolute if no distance provided, relative to distance \* distance otherwise

###### Returns

Array of triangles partitioning the polygon (`Array<Triangle>`).

### `triangulateToUnique(polygon, distance, minimumTriangleArea)`

Triangulate a polygon to triangles smaller then a distance, and return them via unique points.

Grid points are placed inside the polygon to obtain small, well conditioned triangles.

This function returns the triangulation as an array of unique points, and triangles of indices refering to those unique points.

###### Parameters

* `polygon` (`Array<Array<Point>>`)
  * Polygon
* `distance?` (`number | undefined`)
  * Distance that conditions the triangles
* `minimumTriangleArea` (`number | undefined`)
  * Minimum area of the resulting triangles (filters out slivers), absolute if no distance provided, relative to distance \* distance otherwise

###### Returns

Triangulation Object with uniquePointIndexTriangles and uniquePoints (`{ interpolatedPolygon: Polygon; interpolatedPolygonPoints: Point[]; gridPoints: Point[]; gridPointsInPolygon: Point[]; uniquePoints: Point[]; triangles: Triangle[]; uniquePointIndexTriangles: TypedTriangle<number>[]; uniquePointIndexInterpolatedPolygon: TypedPolygon<number>; uniquePointIndexEdges: TypedLine<number>[...`).
