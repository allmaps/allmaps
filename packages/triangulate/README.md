# @allmaps/triangulate

This package provides methods to triangulate a polygon: i.e. return a set of triangles that partition the polygon.

It does this in a constrained way, where the triangles meet certain conditions: if a `distance` parameter is provided, the triangles are not larger than `distance`, and in general don't contain very sharp angles or very blunt angles.

This package is used internally in [@allmaps/render](../../packages/render/) to triangulate the full mask of a georeferenced map (using the GCPs as Steiner points and the appliable mask as Steiner polygons) into a set of triangles that can be rendered with WebGL.

## How it works

It uses a modern **constrained Delaunay triangulation algorithm** for polygons, built using [Delaunator](https://github.com/mapbox/delaunator) and [Constrainautor](https://github.com/kninnug/Constrainautor).

To learn more on how it works, check out this [Observable notebook](https://observablehq.com/d/efde1d04f1a9bc17).

In short, triangles are made firstly using a grid of points within the bounding box of the polygon, spaced `distance` apart, and with points resulting from the polygons edges (interpolated using `distance`), provided Steiner points and points from the Steiner Polygons. From all these points, a Delaunay triangulation is performed. This results in most grid cell resulting in two well-conditioned triangles. Then the triangulation is constrained with the edges of the interpolated polygon and the edges of the interpolated Steiner polygons.

## Installation

This is an ESM-only module that works in browsers and Node.js.

Install using npm:

```sh
npm install @allmaps/triangulate
```

## Usage

This package exposes two functions: `triangulate()` simply triangulates a polygon and returns the triangles, and `triangulateToUnique()` returns a set of objects that describe the triangulation using an array of unique points and edges between them.

In the simplest case, it can be used as follows:

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

To both functions, the following options can be passed:

* `steinerPoints`: Steiner points. These become a third group of points taken into account when building the triangles.
* `steinerPolygons`: Steiner polygons. These are polygons whose points need to be added as Steiner points, and whose edges (interpolated using distance) also need to be constrained.
* `minimumTriangleAngle`: The minimum angle (in radians) of the resulting triangles. Using this options, sliver polygons that are possibly produced by internal functions can be removed. Default: `0.01`.
* `computeInsideSteinerPolygons`: Whether or not to compute, for each triangle, whether they are inside the Steiner polygons or not.

## License

MIT

## API

### `TriangluationOptions`

###### Fields

* `minimumTriangleAngle` (`number`)
* `steinerPoints` (`Array<Point>`)

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

### `triangulate(polygon, distance, triangulationOptions)`

Triangulate a polygon to triangles smaller then a distance

Grid points are placed inside the polygon to obtain small, well conditioned triangles.

###### Parameters

* `polygon` (`Array<Array<Point>>`)
  * Polygon
* `distance?` (`number | undefined`)
  * Distance that conditions the triangles
* `triangulationOptions?` (`Partial<TriangluationOptions> | undefined`)
  * Triangulation Options.

###### Returns

Array of triangles partitioning the polygon (`Array<Triangle>`).

### `triangulateToUnique(polygon, distance, triangulationOptions)`

Triangulate a polygon to triangles smaller then a distance, and return them via unique points.

Grid points are placed inside the polygon to obtain small, well conditioned triangles.

This function returns the triangulation as an array of unique points, and triangles of indices refering to those unique points.

###### Parameters

* `polygon` (`Array<Array<Point>>`)
  * Polygon
* `distance?` (`number | undefined`)
  * Distance that conditions the triangles
* `triangulationOptions?` (`Partial<TriangluationOptions> | undefined`)
  * Triangulation Options.

###### Returns

Triangulation Object with uniquePointIndexTriangles and uniquePoints (`{ interpolatedPolygon: Polygon; interpolatedPolygonPoints: Point[]; gridPoints: Point[]; gridPointsInPolygon: Point[]; uniquePoints: Point[]; triangles: Triangle[]; uniquePointIndexTriangles: TypedTriangle<number>[]; uniquePointIndexInterpolatedPolygon: TypedPolygon<number>; uniquePointIndexEdges: TypedLine<number>[...`).

## Notes

### Stability

* Constrainautor doesn't allow self-intersection polygons and will raise an error for such inputs.

### Benchmark

For a 10 point polygon (with diameter ~ 200), here are some benchmarks for computing the triangulation with given distances:

* `triangulate(polygon, 1000)` (no grid points): 74544 ops/s to compute 8 triangles
* `triangulate(polygon, 100)`: 56849 ops/s to compute 11 triangles
* `triangulate(polygon, 10)`: 2163 ops/s to compute 435 triangles
* `triangulate(polygon, 1)`: 3 ops/s to compute 38352 triangles

See [`./bench/index.js`](`./bench/index.js`).

To run the benchmark, run `npm run bench`.
