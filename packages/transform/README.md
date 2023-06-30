# @allmaps/transform

Allmaps Transformation Library

## Aim

This module serves to **transform points**, polygons and other spatial features from one cartesian `(x, y)` plane to another **using a set of control points** identified in both planes.

In the Allmaps case this transformation is **from the pixel coordinates space** of a IIIF Resource **to the map coordinate space** of an interactive map.

This module's main usage in the Allmaps stack is in [@allmaps/render](../render) and [@allmaps/tileserver](../../apps/tileserver/), two locations where we produce a georeferenced image by triangulating a IIIF image and drawing these triangular parts on a map in a location computed by the transformation algorithm constructed from the annotation.

This library started out as a JavaScript port of [gdaltransform](https://gdal.org/programs/gdaltransform.html) (as described in [this notebook](https://observablehq.com/@bertspaan/gdaltransform?collection=@bertspaan/iiif-maps)) and initially only implemented polynomial transformations of order 1. Later Thin Plate Spline transformations were added (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) amongst other transformations, which lead to a refactoring using the [`ml-matrix`](https://github.com/mljs/matrix) library applied for creating and solving the linear systems of equations which are the essence of each of these transformations. The algorithms correspond to those of GDAL and the results are (nearly) identical as can be checked in the [tests](./test/test-transform.js).

## Supported transformations

The following transformations are supported:

| Type                | Options    | Description                                           | Properties                                                       | Min number of control points |
| ------------------- | ---------- | ----------------------------------------------------- | ---------------------------------------------------------------- | -------------------- |
| `helmert`           |            | Helmert transformation or 'similarity transformation' | Preserves shape and angle  |   2                   |
| `polynomial`        | `order: 1` | First order polynomial transformation                 | Preserves lines and parallelism                                                                 |   3                  |
| `polynomial`        | `order: 2` | Second order polynomial transformation                | Some bending flexibility                                                                 | 6                     |
| `polynomial`        | `order: 3` | Third order polynomial transformation                 | More bending flexibility                                                                 |  10                    |
| `thin-plate-spline` |            | Thin Plate Spline transformation or 'rubber sheeting' (with affine part) | Exact, smooth (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) |  3                    |
| `projective`        |            | Projective or 'perspective' transformation, used for aerial images              | Preserves lines and cross-ratios                                         |  4                    |

## Usage

First install using your favourite package manager. Then use in this way:

```js
import { GCPTransformer } from '@allmaps/transform'

// ground control points
const gcps = [
  {
    image: [518, 991],
    world: [4.9516614, 52.4633102]
  },
  {
    image: [4345, 2357],
    world: [5.0480391, 52.5123762]
  },
  {
    image: [2647, 475],
    world: [4.9702906, 52.5035815]
  }
]

// create a transformation of a specific type using the ground control points
const transformer = new GCPTransformer(gcps, 'helmert')

// forward transform
const result = transformer.toWorld([100, 100])
// result = [4.9385700843392435, 52.46580484503631]

// backward transform
const result = transformer.toResource([4.9385700843392435, 52.46580484503631])
// result = [100, 100]
```

The transformer Class also exports the function `transformer.toGeoJSON()` for forward transforms (Arrays of) [x, y] position(s) to the geometry object of the appropriate GeoJSON object (Point, LineString, Polygon), and the function `transformer.fromGeoJSON()` to take in such a GeoJSON object and backwards transform it to an (Array of) [x, y] position(s).

```js
const geoJSONPointGeometry = transformer.toGeoJSON([100, 100])
// geojsonPointGeometry = {
//     type: "Point",
//     coordinates: [4.9385700843392435, 52.46580484503631]
//   }
const geoJSONPoint = {
  "type": "Feature",
  "geometry": geojsonPointGeometry
}
// geojsonPoint = {
//   "type": "Feature",
//   "geometry": {
//     type: "Point",
//     coordinates: [4.9385700843392435, 52.46580484503631]
//   }
// }

const point = transformer.fromGeoJSON(geoJSONPointGeometry)
// point = [100, 100]
```

Both of these functions can take a second argument with options for this transformation

| Option           | Description                                                     | Default
|:-----------------|:----------------------------------------------------------------|:--------
| `maxOffsetRatio` | Maximum offset ratio between original and transformed midpoints | 0
| `maxDepth`       | Maximum recursion depth                                         | 6

```js
const options = {
  maxOffsetRatio: 0.05,
  maxDepth: 6
}
const geoJSONLineGeometry = transformer.toGeoJSON([[100, 100], [110, 115], [120, 170]], options)
/// geoJSONLineGeometry = ...
```

### CLI

The [@allmaps/cli](../../apps/cli/) package exports an interface to transform **SVG** objects from the pixel coordinates space of a IIIF Resource to **GeoJSON** objects in the map coordinate space of an interactive map or vise versa **given (the ground control points and transformation type from) a Georeference Annotation**, and to export the SVG pixel mask included in a Georeference Annotation as a GeoJSON object.

In the future, we hope to add an interface to manually enter coordinates of points to transform forward or backwards and easily specify gcps and transformation type.

### Notes

- Only **linearly independent control points** should be considered when checking if the criterion for the minimum number of control points is met. For example, three control points that are collinear (one the same line) only count as two linearly independent points. The current implementation doesn't check such linear (in)dependance, but building a transformer with insufficient linearly independent control points will result in a badly conditioned matrix (no error but diverging results) or non-invertible matrix (**error when inverting matrix**).
- The examples here use `(longitude, latitude)` coordinates in the destination space, but it is important to stress that the functions `toWorld()` and `toResource()` are currently map-projection agnostic forward and backward transformations built for the general case of a transformation for one cartesian `(x, y)` plane to another (even though their name suggests otherwise). **When working in a geographic context** one can use control points with `(longitude, latitude)` coordinates in the destination space, which will build a transformation to the cartesian plane of an equidistant projection.  One could also transform such coordinates to a specific projection (for example Mercator) first and use control points with such projection coordinates in the destination space. This will build a transformation to the cartesian space of a Mercator projection. The output of the `toResource()` function is then also in these coordinates. Finally, since `toGeoJSON()` and `fromGeoJSON()` were specifically built with `(longitude, latitude)` coordinates in mind (as they are used in GeoJSON objects), these functions should only be used for such coordinates.

### Benchmark

Here are some benchmarks on building and using a transformer.

Create transformer with 10 points (and transform 1 point)

| Type                | Options    | Ops/s |
| ------------------- | ---------- | ----- |
| `helmert`           |            | 20813 |
| `polynomial`        | `order: 1` | 32631 |
| `polynomial`        | `order: 2` | 20927 |
| `polynomial`        | `order: 3` | 6682  |
| `thin-plate-spline` |            | 4532  |
| `projective`        |            | 7044  |

Use transformer made with with 10 points

| Type                | Options    | Ops/s   |
| ------------------- | ---------- | ------- |
| `helmert`           |            | 7561796 |
| `polynomial`        | `order: 1` | 5546792 |
| `polynomial`        | `order: 2` | 4811662 |
| `polynomial`        | `order: 3` | 887390  |
| `thin-plate-spline` |            | 154310  |
| `projective`        |            | 5265895 |

See `./bench/index.js`
