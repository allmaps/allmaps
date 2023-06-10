# @allmaps/triangulate

Allmaps Triangulation Library

## Aim

This module implements a simple **constrained Delaunay triangulation algorithm** for polygons, built using [poly2tri.js](https://github.com/r3mi/poly2tri.js).

It is used in the Allmaps stack to triangulate an image mask and sending the list of small triangules to WebGL for rendering.

To find out how it works, check out this [Observable notebook](https://observablehq.com/d/199e169d58f0bf0d).

## Usage

Install using your favourite package manager.

```js
import { triangulate } from '@allmaps/triangulate'

// polygons are not round-trip
const polygon = [
  [0.592, 0.953],
  [0.304, 2.394],
  [2.904, 2.201],
  [2.394, 0.232]
]

const distance = 1

// compute constrained triangulation of 'polygon' using a mesh of size 'distance'
const triangles = triangulate(polygon, distance)

// triangles = [
//   [
//     [1.3012562303117026, 2.3199729029037854],
//     [0.304, 2.394],
//     [1.304, 2.232]
//   ],
//   ...
// ]
```

The package exports two functions

- `triangulate()` outputs an Array of triangles, each under the form `[[x0, y0], [x1, y1], [x2, y2]]`. Polygons with < 3 just return an empty array.
- `triangulatePoly2tri()` outputs the triangles in the same fashion as `poly2tri`, with ritch information on constrained edges, neighbours, interiour, ...

### Stability

- `poly2tri` doesn't allow self-intersection polygons and will raise an error for such inputs.
- For certain polygon vertex configurations an especially for round numbers or small distance sizes, poly2tri is known to throw errors such as 'point collinearity' or 'pointerror'.

### Benchmark

For a 10 point polygon, here are some benchmarks for computing the triangulation with the distance as a fraction of the polygon's bbox diameter:

- `triangulate(polygon, 1)`: 66719 ops/s to compute 8 triangles
- `triangulate(polygon, bboxDiameter / 10)`: 10924 ops/s to compute 86 triangles
- `triangulate(polygon, bboxDiameter / 40)`: 1115 ops/s to compute 1048 triangles
- `triangulate(polygon, bboxDiameter / 100)`: 167 ops/s to compute 6216 triangles

See `./bench/index.js`
