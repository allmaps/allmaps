# @allmaps/transform

This module serves to **transform points**, lines, polygons and other spatial features from one cartesian `(x, y)` source-plane to a destination-plane **using a set of control points** who's coordinates are known in both planes.

It is used in [@allmaps/render](../../packages/render/) and [@allmaps/tileserver](../../apps/tileserver/), two packages where we produce a georeferenced image by triangulating a IIIF image and drawing these triangles on a map in a specific new location, with the triangle's new vertex location computed by the transformer of this package. The transformer is constructed from control points in the annotation and transforms positions **from the resource coordinate space** of a IIIF Resource **to the geo coordinate space** of an interactive map.

## How it works

This library started out as a JavaScript port of [gdaltransform](https://gdal.org/programs/gdaltransform.html) (as described in [this notebook](https://observablehq.com/@bertspaan/gdaltransform?collection=@bertspaan/iiif-maps)) and initially only implemented polynomial transformations of order 1. Later Thin Plate Spline transformations were added (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) amongst other transformations, which lead to a refactoring using the [`ml-matrix`](https://github.com/mljs/matrix) library applied for creating and solving the linear systems of equations which are the essence of each of these transformations.

The algorithms correspond to those of **GDAL** and the results are (nearly) identical as can be checked in the [tests](./test/test-transform.js).

These are the **supported transformations**:

| Type              | Options    | Description                                                              | Properties                                                                       | Minimum number of GCPs |
|-------------------|------------|--------------------------------------------------------------------------|----------------------------------------------------------------------------------|------------------------|
| `helmert`         |            | Helmert transformation or 'similarity transformation'                    | Preserves shape and angle                                                        | 2                      |
| `polynomial`      | `order: 1` | First order polynomial transformation                                    | Preserves lines and parallelism                                                  | 3                      |
| `polynomial`      | `order: 2` | Second order polynomial transformation                                   | Some bending flexibility                                                         | 6                      |
| `polynomial`      | `order: 3` | Third order polynomial transformation                                    | More bending flexibility                                                         | 10                     |
| `thinPlateSpline` |            | Thin Plate Spline transformation or 'rubber sheeting' (with affine part) | Exact, smooth (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) | 3                      |
| `projective`      |            | Projective or 'perspective' transformation, used for aerial images       | Preserves lines and cross-ratios                                                 | 4                      |

## Usage

The transformer is built using a set of ground control points.

Ground control points can be supplied as an array of
`{source: [number, number], destination: [number, number]}` objects. Alternatively an array of `{resource: [number, number], geo: [number, number]}` is supported too, which is clearer in the Allmaps use case.

### Points

```js
import { GCPTransformer } from '@allmaps/transform'

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

const transformer = new GCPTransformer(transformGcps3, 'helmert')

const transformedPosition = transformer.transformForward([100, 100])
// transformedPosition = [4.9385700843392435, 52.46580484503631]

const transformedPosition = transformer.transformBackward([4.9385700843392435, 52.46580484503631])
// transformedPosition = [100, 100]
```

Instead of `transformForward()` one can use `transformToGeo()` which is clearer in the Allmaps use case. For `transformBackward()` there is `transformToResource()`.

## Lines and Polygons

The transformer Class also exports more general functions to transform points ('positions'), lines ('lineStrings') and polygons ('rings') forward or backward.

Positions can be supplied input as `[number, number]`, and lines as arrays of positions and polygons as (unclosed) arrays of positions. (Note that polygons with holes are currently not supported.)

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
    maxOffsetRatio: 0.01,
    maxDepth: 1
}

const transformer = new GCPTransformer(transformGcps6, 'thinPlateSpline')

const lineString = [
  [1000, 1000],
  [1000, 2000],
  [2000, 2000],
  [2000, 1000]
]

const transformedLineString = transformer.transformLineStringForwardToLineString(lineString, transformOptions)
// transformedLineString = [
//   [4.388957777030093, 51.959084191571606],
//   [4.392938913951547, 51.94062947962427],
//   [4.425874493300959, 51.94172557475595],
//   [4.4230497784967655, 51.950815146974556],
//   [4.420666790347598, 51.959985351835975]
// ]
```

When transforming a line or polygon, it can happen that simply transforming every position is not sufficient. Two factors are at play which may require a more granular transformation: the transformation (which can be non-shape preserving, as is the case with all transformation in this package except for Helmert and 1st degree polynomial) or the geographic nature of the coordinates (where lines are generally meant as 'great arcs' but could be interpreted as lon-lat cartesian lines). An algorithm will therefore recursively add midpoints in each segment (i.e. between two positions) to make the line more granular. A midpoint is added at the transformed middle position of the original segment on the condition that the ratio of (the distance between the middle position of the transformed segment and the transformed transformed middle position of the original segment) to the length of the transformed segment, is larger then a given ratio. The following options specify if and with what degree of detail such extra points should be added.

| Option                    | Description                                                              | Default                                  |
|:--------------------------|:-------------------------------------------------------------------------|:-----------------------------------------|
| `maxOffsetRatio`          | Maximum offset ratio (smaller means more midpoints)                      | 0                                        |
| `maxDepth`                | Maximum recursion depth (higher means more midpoints)                    | 6                                        |
| `destinationIsGeographic` | Use geographic distances and midpoints for lon-lat destination positions | false (true when destination is GeoJSON) |
| `sourceIsGeographic`      | Use geographic distances and midpoints for lon-lat source positions      | false (true when source is GeoJSON)      |

## GeoJSON Geometries

Transformation functions also exist for transforming from and/or to GeoJSON Geometries. When supplying a GeoJSON input the corresponding 'geographic' option is set to true (but can be overwritten).

```js
const transformOptions = {
  maxOffsetRatio: 0.00001,
  maxDepth: 1
}

const transformer = new GCPTransformer(transformGcps6, 'thinPlateSpline')

const geoJSONPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [4.388957777030093, 51.959084191571606],
      [4.392938913951547, 51.94062947962427],
      [4.425874493300959, 51.94172557475595],
      [4.420666790347598, 51.959985351835975],
      [4.388957777030093, 51.959084191571606]
    ]
  ]
}

const transformedRing = transformer.transformGeoJSONPolygonBackwardToRing(geoJSONPolygon, transformOptions)
// transformedRing = [
//   [1032.5263837176526, 992.2883187637146],
//   [1045.038670070595, 1489.2938524267215],
//   [1056.6257766352364, 1986.6566391349374],
//   [1520.5146305339294, 1995.064826625076],
//   [1972.2719445148632, 2006.6657102722945],
//   [1969.4756718048366, 1507.0983522493168],
//   [1957.822599920541, 1009.7982201488556],
//   [1495.7555378955249, 1000.7599463685738]
// ]
```

Overall there are functions for forward and backward of position, line and ring (each possibly GeoJSON): this totals to 24 transform functions!

### CLI

The [@allmaps/cli](../../apps/cli/) package exports an interface to transform positions, to transform **SVG** objects from the resource coordinates space of a IIIF Resource to **GeoJSON** objects in the geo coordinate space of an interactive map or vise versa **given (the ground control points and transformation type from) a Georeference Annotation**, and to export the SVG resource mask included in a Georeference Annotation as a GeoJSON object.

### Notes

- Only **linearly independent control points** should be considered when checking if the criterion for the minimum number of control points is met. For example, three control points that are collinear (one the same line) only count as two linearly independent points. The current implementation doesn't check such linear (in)dependance, but building a transformer with insufficient linearly independent control points will result in a badly conditioned matrix (no error but diverging results) or non-invertible matrix (**error when inverting matrix**).
- The transform functions are map-projection agnostic: they describe a transformation for one cartesian `(x, y)` plane to another. Using control points with `(longitude, latitude)` coordinates will produce a transformation from or to the cartesian plane of an equirectangular projection. (The only semi-exception to this is when using the `destinationIsGeographic` and `sourceIsGeographic` parameters - although these consider coordinates as lying on a sphere more then as projection coordinates.)

### Benchmark

Here are some benchmarks on building and using a transformer, as computed on a 2023 Macbook Air M2.

Create transformer with 10 points (and transform 1 point)

| Type              | Options    | Ops/s  |
|-------------------|------------|--------|
| `helmert`         |            | 83303  |
| `polynomial`      | `order: 1` | 160587 |
| `polynomial`      | `order: 2` | 86350  |
| `polynomial`      | `order: 3` | 33860  |
| `thinPlateSpline` |            | 28180  |
| `projective`      |            | 35821  |

Use transformer made with with 10 points

| Type              | Options    | Ops/s    |
|-------------------|------------|----------|
| `helmert`         |            | 27363412 |
| `polynomial`      | `order: 1` | 22763099 |
| `polynomial`      | `order: 2` | 19214899 |
| `polynomial`      | `order: 3` | 3840573  |
| `thinPlateSpline` |            | 491728   |
| `projective`      |            | 22993028 |

See `./bench/index.js`
