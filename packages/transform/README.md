# @allmaps/transform

This module serves to **transform points, lines, polygons** and other spatial features from one cartesian `(x, y)` source-plane to a destination-plane **using a set of control points** who's coordinates are known in both planes.

It is used in [@allmaps/render](../../packages/render/) and [@allmaps/tileserver](../../apps/tileserver/), two packages where we produce a georeferenced image by triangulating a IIIF image and drawing these triangles on a map in a specific new location, with the triangle's new vertex location computed by the transformer of this package. The transformer is constructed from control points in the annotation and transforms positions from the resource coordinate space of a IIIF Resource to the geo coordinate space of an interactive map.

Care was taken to make this module **usable and useful outside of the Allmaps context** as well! Feel free to incorporate it in your project.

## How it works

This package exports the GcpTransformer class. It's instances (called 'transformers') are built from a set of ground control points an a specified transformation type. Once a transformer is built, it's methods (functions) can be used for transforming a geometry.

### Transform vs GDAL

The transformation algorithms of this package correspond to those of **GDAL** and the results are (nearly) identical, as is be checked in the [tests](./test/test-transform.js).

For a little history: this library started out as a JavaScript port of [gdaltransform](https://gdal.org/programs/gdaltransform.html) (as described in [this notebook](https://observablehq.com/@bertspaan/gdaltransform?collection=@bertspaan/iiif-maps)) and initially only implemented polynomial transformations of order 1. Later Thin Plate Spline transformations were added (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) amongst other transformations, which lead to a refactoring using the [`ml-matrix`](https://github.com/mljs/matrix) library applied for creating and solving the linear systems of equations which are the essence of each of these transformations.

### Supported transformation types

| Type                   | Options    | Description                                                              | Properties                                                                       | Minimum number of GCPs |
|------------------------|------------|--------------------------------------------------------------------------|----------------------------------------------------------------------------------|------------------------|
| `helmert`              |            | Helmert transformation or 'similarity transformation'                    | Preserves shape and angle                                                        | 2                      |
| `polynomial` (default) | `order: 1` | First order polynomial transformation                                    | Preserves lines and parallelism                                                  | 3                      |
| `polynomial`           | `order: 2` | Second order polynomial transformation                                   | Some bending flexibility                                                         | 6                      |
| `polynomial`           | `order: 3` | Third order polynomial transformation                                    | More bending flexibility                                                         | 10                     |
| `thinPlateSpline`      |            | Thin Plate Spline transformation or 'rubber sheeting' (with affine part) | Exact, smooth (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) | 3                      |
| `projective`           |            | Projective or 'perspective' transformation, used for aerial images       | Preserves lines and cross-ratios                                                 | 4                      |

### Defining Ground Controle Points

Ground control points can be supplied as an array of
`{source: [number, number], destination: [number, number]}` objects.

Alternatively an array of `{resource: [number, number], geo: [number, number]}` is supported too, which is more expressive in the Allmaps use case.

### Transformation methods

A transformer contain the forward and backward transformation. They all accepts points, lines and polygons, both as Allmaps geometries or GeoJSON geometries. There are separate functions for transforming to Allmaps geometries or to GeoJSON geometries. There are also separate functions for transforming forward or backward.

Hence, the main functions are: `transformForward()`, `transformForwardAsGeojson()`, `transformBackward()` and `transformBackwardAsGeojson()`

Alternatively the same four functions are available with more expressive term for the Allmaps use case: replacing `Forward` by `ToGeo` and `Backward` by `ToResource`. E.g.: `transformToGeoAsGeojson()`.

The Allmaps geometries are:

```js
export type Position = [number, number]

export type LineString = Position[]

export type Polygon = Position[][]
// A polygon is an array of rings of at least three positions
// Rings are not closed: the first position is not repeated at the end.
// There is no requirement on winding order.

export type Geometry = Position | LineString | Polygon
```

### Refined transfromation of LineStrings and Polygons

When transforming a line or polygon, it can happen that simply transforming every position is not sufficient. Two factors are at play which may require a more granular transformation: the transformation (which can be non-shape preserving, as is the case with all transformation in this package except for Helmert and 1st degree polynomial) or the geographic nature of the coordinates (where lines are generally meant as 'great arcs' but could be interpreted as lon-lat cartesian lines). An algorithm will therefore recursively add midpoints in each segment (i.e. between two positions) to make the line more granular. A midpoint is added at the transformed middle position of the original segment on the condition that the ratio of (the distance between the middle position of the transformed segment and the transformed transformed middle position of the original segment) to the length of the transformed segment, is larger then a given ratio. The following options specify if and with what degree of detail such extra points should be added.

| Option                    | Description                                                              | Default                                      |
|:--------------------------|:-------------------------------------------------------------------------|:---------------------------------------------|
| `maxOffsetRatio`          | Maximum offset ratio (smaller means more midpoints)                      | `0`                                          |
| `maxDepth`                | Maximum recursion depth (higher means more midpoints)                    | `6`                                          |
| `sourceIsGeographic`      | Use geographic distances and midpoints for lon-lat source positions      | `false` (`true` when source is GeoJSON)      |
| `destinationIsGeographic` | Use geographic distances and midpoints for lon-lat destination positions | `false` (`true` when destination is GeoJSON) |

## Installation

This is an ESM-only module that works in browsers or in Node.js.

Use [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/) to install this CLI tool globally in your system:

```sh
pnpm add @allmaps/transform
```

or

```sh
nnpm install @allmaps/transform
```

## Usage

### Point

```js
import { GcpTransformer } from '@allmaps/transform'

const transformGcps3 = [
  {
    source: [518, 991],
    destination: [4.9516614, 52.4633102]
  },
  {
    source: [4345, 2357],
    destination: [5.0480391, 52.5123762]
  },
  {
    source: [2647, 475],
    destination: [4.9702906, 52.5035815]
  }
]

const transformer = new GcpTransformer(transformGcps3, 'helmert')

const transformedPosition = transformer.transformForward([100, 100])
// transformedPosition = [4.9385700843392435, 52.46580484503631]

const transformedPosition = transformer.transformBackward([4.9385700843392435, 52.46580484503631])
// transformedPosition = [100, 100]
```

### LineString

In this example we transform Backward, and from a GeoJSON Geometry.

```js
export const transformGcps7 = [
  {
    source: [0, 0],
    destination: [0, 0]
  },
  {
    source: [100, 0],
    destination: [20, 0]
  },
  {
    source: [200, 100],
    destination: [40, 20]
  },
  {
    source: [200, 200],
    destination: [40, 40]
  },
  {
    source: [150, 250],
    destination: [40, 100]
  },
  {
    source: [100, 200],
    destination: [20, 40]
  },
  {
    source: [0, 100],
    destination: [0, 20]
  }
]

const transformOptions = {
  maxOffsetRatio: 0.001,
  maxDepth: 2,
}
// We transform backward (from destination to source) and have GeoJSON input.
// Hence `destinationIsGeographic: true` will be set automatically

const transformer = new GcpTransformer(transformGcps7, 'polynomial')

const lineStringGeoJSON = {
  type: 'LineString',
  coordinates: [
    [10, 50],
    [50, 50]
  ]
}

const transformedLineString = transformer.transformBackward(lineStringGeoJSON, transformOptions)
// transformedLineString = [
//   [31.06060606060611, 155.30303030303048],
//   [80.91200458875993, 165.7903106766409],
//   [133.1658635549907, 174.5511756850417],
//   [185.89024742146262, 181.22828756380306],
//   [237.12121212121218, 185.60606060606085]
// ]

// Notice how the result has two layers of midpoints!
```

### Polygon

In this example we transform to a GeoJSON Geometry.

```js
export const transformGcps6 = [
  {
    source: [1344, 4098],
    destination: [4.4091165, 51.9017125]
  },
  {
    source: [4440, 3441],
    destination: [4.5029222, 51.9164451]
  },
  {
    source: [3549, 4403],
    destination: [4.4764224, 51.897309]
  },
  {
    source: [1794, 2130],
    destination: [4.4199066, 51.9391509]
  },
  {
    source: [3656, 2558],
    destination: [4.4775683, 51.9324358]
  },
  {
    source: [2656, 3558],
    destination: [4.4572643, 51.9143043]
  }
]

const transformOptions = {
  maxOffsetRatio: 0.00001,
  maxDepth: 1
}

const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')

const polygon = [
  [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
]

const transformedPolygonGeoJSON = transformer.transformForwardAsGeojson(polygon, transformOptions)
// const transformedPolygonGeoJSON = {
//   type: 'Polygon',
//   coordinates: [
//     [
//       [4.388957777030093, 51.959084191571606],
//       [4.390889520773774, 51.94984430356657],
//       [4.392938913951547, 51.94062947962427],
//       [4.409493277493718, 51.94119110133424],
//       [4.425874493300959, 51.94172557475595],
//       [4.4230497784967655, 51.950815146974556],
//       [4.420666790347598, 51.959985351835975],
//       [4.404906205946158, 51.959549039424715],
//       [4.388957777030093, 51.959084191571606]
//     ]
//   ]
// }
```

### Notes

- Only **linearly independent control points** should be considered when checking if the criterion for the minimum number of control points is met. For example, three control points that are collinear (one the same line) only count as two linearly independent points. The current implementation doesn't check such linear (in)dependance, but building a transformer with insufficient linearly independent control points will result in a badly conditioned matrix (no error but diverging results) or non-invertible matrix (**error when inverting matrix**).
- The transform functions are map-projection agnostic: they describe a transformation for one cartesian `(x, y)` plane to another. Using control points with `(longitude, latitude)` coordinates will produce a transformation from or to the cartesian plane of an equirectangular projection. (The only semi-exception to this is when using the `destinationIsGeographic` and `sourceIsGeographic` parameters - although these consider coordinates as lying on a sphere more then as projection coordinates.)

## CLI

The [@allmaps/cli](../../apps/cli/) package exports an interface to transform positions, to transform **SVG** objects from the resource coordinates space of a IIIF Resource to **GeoJSON** objects in the geo coordinate space of an interactive map or vise versa **given (the ground control points and transformation type from) a Georeference Annotation**, and to export the SVG resource mask included in a Georeference Annotation as a GeoJSON object.

### Benchmark

Here are some benchmarks on building and using a transformer, as computed on a 2023 Macbook Air M2.

Create transformer with 10 points (and transform 1 point)

| Type              | Options    | Ops/s  |
|-------------------|------------|--------|
| `helmert`         |            | 71338  |
| `polynomial`      | `order: 1` | 163419 |
| `polynomial`      | `order: 2` | 86815  |
| `polynomial`      | `order: 3` | 33662  |
| `thinPlateSpline` |            | 27905  |
| `projective`      |            | 36202  |

Use transformer made with with 10 points

| Type              | Options    | Ops/s    |
|-------------------|------------|----------|
| `helmert`         |            | 27398212 |
| `polynomial`      | `order: 1` | 22364872 |
| `polynomial`      | `order: 2` | 19126410 |
| `polynomial`      | `order: 3` | 3925102  |
| `thinPlateSpline` |            | 484141   |
| `projective`      |            | 22657850 |

See `./bench/index.js`
