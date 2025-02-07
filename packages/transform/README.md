# @allmaps/transform

This module contains classes and methods to **transform Points, LineStrings, Polygons** and other spatial features from a 2D cartesian `(x, y)` source space to a destination space. The transformation function that accomplish this are constructed from **a set of Control Points**, who's coordinates are known in both planes, and a specific transformation algorithm.

Within the Allmaps project, this module is used a.o. in [@allmaps/render](../../packages/render/) and [@allmaps/tileserver](../../apps/tileserver/), two packages where we transform a IIIF image from the 'resource' space of the image to the '(projected) geospatial' space of a map projection (in most cases WebMercator). We construct the necessary transformation functions from the Ground Control Points that can be found in the map's Georeference Annotation.

Like all other Allmaps modules, care was taken to make this module usable and useful outside of the Allmaps context as well! Feel free to incorporate it in your project if it could be useful.

## How it works

This package exports the `GcpTransformer` class. Its instances (called 'transformers') are built from a set of Ground Control Points (GCPs) and a specified transformation type. Using these, a forward and backward transformation can be built that map arbitrary Points in one plane to the corresponding Points in the other plane. The transformer has dedicated functions that use these two transformations to transform Points, and more complex geometries like LineStrings and Polygons, forward and backward.

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Install with npm:

```sh
npm install @allmaps/transform
```

## Usage

### Point

In this example we transform forward.

```js
import { GcpTransformer } from '@allmaps/transform'

export const generalGcps3 = [
  {
    source: [0, 0],
    destination: [0, 0]
  },
  {
    source: [0, 1],
    destination: [1, 4]
  },
  {
    source: [1, 0],
    destination: [5, 10]
  }
]

const transformer = new GcpTransformer(generalGcps3, 'polynomial')

const transformedPoint = transformer.transformForward([1, 1])
// transformedPoint = [6, 14]
```

### LineString

In this example we transform backward.

```js
import { GcpTransformer } from '@allmaps/transform'

const gcps7 = [
  {
    resource: [0, 0],
    geo: [0, 0]
  },
  {
    resource: [100, 0],
    geo: [20, 0]
  },
  {
    resource: [200, 100],
    geo: [40, 20]
  },
  {
    resource: [200, 200],
    geo: [40, 40]
  },
  {
    resource: [150, 250],
    geo: [40, 100]
  },
  {
    resource: [100, 200],
    geo: [20, 40]
  },
  {
    resource: [0, 100],
    geo: [0, 20]
  }
]

const options = {
  maxDepth: 2
}

const transformer = new GcpTransformer(gcps7, 'polynomial')

const lineString = [
  [10, 50],
  [50, 50]
]

const transformedLineString = transformer.transformBackward(
  lineString,
  options
)
// transformedLineString = [
//   [31.06060606060611, 155.30303030303048],
//   [82.57575757575762, 162.8787878787881],
//   [134.09090909090912, 170.45454545454567],
//   [185.60606060606065, 178.0303030303033],
//   [237.12121212121218, 185.60606060606085]
// ]

// Notice how the result has two layers of midpoints!
// In a first step the Point [134.09, 170.45] is added between the start and end Point
// Then [82.57, 162.87] and [185.60, 178.03] are added in between.
```

### Polygon

In this example we use a Thin Plate Spline transformation.

```js
import { GcpTransformer } from '@allmaps/transform'

const gcps6 = [
  {
    resource: [1344, 4098],
    geo: [4.4091165, 51.9017125]
  },
  {
    resource: [4440, 3441],
    geo: [4.5029222, 51.9164451]
  },
  {
    resource: [3549, 4403],
    geo: [4.4764224, 51.897309]
  },
  {
    resource: [1794, 2130],
    geo: [4.4199066, 51.9391509]
  },
  {
    resource: [3656, 2558],
    geo: [4.4775683, 51.9324358]
  },
  {
    resource: [2656, 3558],
    geo: [4.4572643, 51.9143043]
  }
]

const options = {
  minOffsetRatio: 0.00001,
  maxDepth: 1
}

const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')

const polygon = [
  [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
]

const transformedPolygon = transformer.transformForward(
  polygon,
  options
)
// transformedPolygon = [
//     [
//       [4.388957777030093, 51.959084191571606],
//       [4.390889520773774, 51.94984430356657],
//       [4.392938913951547, 51.94062947962427],
//       [4.409493277493718, 51.94119110133424],
//       [4.425874493300959, 51.94172557475595],
//       [4.4230497784967655, 51.950815146974556],
//       [4.420666790347598, 51.959985351835975],
//       [4.404906205946158, 51.959549039424715]
//     ]
//   ]
```

### MultiPoint

In this example we transform a multi-geometry.

```js
import { GcpTransformer } from '@allmaps/transform'

const gcps7 = // see above

// The option `isMultiGeometry` assures the transform method recognises the input (an array of points) as a multiPoint, instead of a lineString
const options = {
  isMultiGeometry: true
}

const transformer = new GcpTransformer(gcps7, 'polynomial')

const multiPoint = [
  [10, 50],
  [50, 50]
]

const transformedMultiPoint = transformer.transformForward(multiPoint, options)
// const transformedMultiPoint = [
//   [31.06060606060611, 155.30303030303048],
//   [237.12121212121218, 185.60606060606085]
// ]
// Note: if the input would have been recognised as a lineString, more points would have been added!
```

## Creating a transformer

Let's go over the different steps of using this package: creating a transformer and using transformer methods.

A transformer is created from a set of **GCPs**, a **transformation type** and some optional **options**.

### GCPs

GCPs follow the GCP type (see below). Each transformation type has a minimum number of GCPs.

Only **linearly independent control points** should be considered when checking if the criterion for the minimum number of control points is met. For example, three control points that are collinear (one the same line) only count as two linearly independent points. The current implementation doesn't check such linear (in)dependance, but building a transformer with insufficient linearly independent control points will result in a badly conditioned matrix (no error but diverging results) or non-invertible matrix (**error when inverting matrix**). See [@allmaps/analyse](../../packages/analyse/) for ways to analyse and check GCP properties.

### Transformation types

The following transformation types are supported.

|                                                                                                                 | Type                                       | Description                                                              | Properties                                                                                                                           | Minimum number of GCPs |
|-----------------------------------------------------------------------------------------------------------------|--------------------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|------------------------|
| <img width="100" src="../ui/src/lib/shared/images/transformations/straight.svg" alt="straight">                 | `straight`                                 | Straight transformation                                                  | Applies translation and scaling. Preserves shapes and angles.                                                                        | 2                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/helmert.svg" alt="helmert">                   | `helmert`                                  | Helmert transformation or 'similarity transformation'                    | Applies translation, scaling and rotation. Preserves shapes and angles.                                                              | 2                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/polynomial-1.svg" alt="polynomial">           | `polynomial` (default), also `polynomial1` | First order polynomial transformation                                    | Applies translation, scaling, rotation and shearing. Preserves lines and parallelism.                                                | 3                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/polynomial-2.svg" alt="polynomial2">          | `polynomial2`                              | Second order polynomial transformation.                                  | Applies second order effects. Adds some bending flexibility.                                                                         | 6                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/polynomial-3.svg" alt="polynomial3">          | `polynomial3`                              | Third order polynomial transformation                                    | Applies third order effects. Adds more bending flexibility.                                                                          | 10                     |
| <img width="100" src="../ui/src/lib/shared/images/transformations/thin-plate-spline.svg" alt="thinPlateSpline"> | `thinPlateSpline`                          | Thin Plate Spline transformation or 'rubber sheeting' (with affine part) | Applies smooth transformation. Transformation is 'exact' at GPCs. (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) | 3                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/projective.svg" alt="projective">             | `projective`                               | Projective or 'perspective' transformation, used for aerial images       | Follow perspective rules. Preserves lines and cross-ratios.                                                                          | 4                      |

## Using transformer methods

Once a transformer is built, its methods can be used to transform geometries forward and backward. Transformer methods take a **Geometry**, some optional **options** and an optional **'return type function'**.

There are separate methods for transforming forward or backward: `transformForward()` and `transformBackward()`.

These methods accepts Points, LineStrings as well as Polygons (and MultiPoints, MultiLineStrings and MultiPolygons) geometries (as defined in [@allmaps/types](../../packages/types/)).

Alternatively the same two methods are available with more expressive term for the Allmaps use casee: `transformToGeo()` and `transformToResource()`.

Note that the backward methods are in general **not the exact inverse** of the forward methods. They are different function created by interpreting the GCPs in the one sense or the other. In some exceptional cases (like for 1st order polynomial transformations with exactly 3 GCPs) the backwards method is the exact inverse. In some cases, the exact inverse can be computed using some simple math from the transformation parameters (like for general 1st order polynomial transformations). In other cases, an exact inverse function could be obtained by implementing stepwise approximation of the inverse function (e.g. gradient descent).

Note that the transform methods are **map-projection agnostic**: they describe a transformation for one cartesian `(x, y)` plane to another. Using control points with `(longitude, latitude)` coordinates will produce a transformation from or to the cartesian plane of an equirectangular projection. (The only semi-exception to this is when using the `destinationIsGeographic` and `sourceIsGeographic` parameters - although these consider coordinates as lying on a sphere more than as projection coordinates.)

### Handling GeoJSON input and output

While this package takes Geometries as input and output (as defined in [@allmaps/types](../../packages/types/)) it is also possible to handle GeoJSON Geometries or SVG Geometries, by converting to and from these geometry types using the functions available in [@allmaps/stdlib](../../packages/stdlib/):

```ts
import { GcpTransformer } from '@allmaps/transform'
import { geojsonGeometryToGeometry, geometryToGeojsonGeometry } from '@allmaps/stdlib'

const gcps7 = ... // see above

const transformer = new GcpTransformer(gcps7, 'polynomial')

const geojsonLineString = {
  type: 'LineString',
  coordinates: [
    [10, 50],
    [50, 50]
  ]
}
const lineString = geojsonGeometryToGeometry(geojsonLineString)

const transformedLineString = transformer.transformBackward(
  lineString,
  options
)
const transformedGeoJsonLineString = geometryToGeojsonGeometry(transformedLineString)
```

For faster transformation between SVG Geometries and GeoJSON Geometries, the following shortcut methods are available as static methods of the GcpTransformer class: `transformSvgToGeojson()`, `transformSvgStringToGeojsonFeatureCollection()`, `transformGeojsonToSvg()`, `transformGeojsonFeatureCollectionToSvgString()`. Example usage:

```ts
import { GcpTransformer } from '@allmaps/transform'

const geojsonFeatureCollection = ... // A feature collection

const svg = GcpTransformer.transformGeojsonFeatureCollectionToSvgString(
  transformer,
  geojsonFeatureCollection,
  transformOptions
)
// svg = ... an SVG string
```

### Transform options

Some options are available to improve transformations.

These options can be specified when using a transformer's method to transform geometries, or earlier upon the creation of the transformer. Options specified in a transformer's method override options specified during the transformer's creation, which in term override the default options.

The `differentHandedness` option is used both when a transformer and when a geometry is transformed, and should not be altered between these two actions.

Here's an overview of the available options:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `maxDepth`                | Maximum recursion depth when recursively adding midpoints (higher means more midpoints)                                                                                                                                                                                                                                                                                   | `number`              | `0` (i.e. no midpoints by default!)                |
| `minOffsetRatio`          | Minimum offset ratio when recursively adding midpoints (lower means more midpoints)                                                                                                                                                                                                                                                                                       | `number`              | `0`                                                |
| `minOffsetDistance`       | Minimum offset distance when recursively adding midpoints (lower means more midpoints)                                                                                                                                                                                                                                                                                    | `number`              | `Infinity` (i.e. condition not applied by default) |
| `minLineDistance`         | Minimum line distance when recursively adding midpoints (lower means more midpoints)                                                                                                                                                                                                                                                                                      | `number`              | `Infinity` (i.e. condition not applied by default) |
| `sourceIsGeographic`      | Use geographic distances and midpoints for lon-lat source points                                                                                                                                                                                                                                                                                                          | `boolean`             | `false`                                            |
| `destinationIsGeographic` | Use geographic distances and midpoints for lon-lat destination points                                                                                                                                                                                                                                                                                                     | `boolean`             | `false`                                            |
| `isMultiGeometry`         | Whether the input should be considered as a MultiPoint, MultiLineString or MultiPolygon. This is necessary since the standard geometry types are not deterministic: the types of LineString and MultiPoint are identical.                                                                                                                                                 | `boolean`             | `false`                                            |
| `differentHandedness`     | Whether one of the axes should be flipped (internally) while computing the transformation parameters. This will not alter the axis orientation of the output (see the 'return type function' for this). Should be true if the handedness differs between the source and destination, and makes a difference for specific transformation types like the Helmert transform. | `boolean`             | `false`                                            |
| `distortionMeasures`      | A list of distortion measures to compute. E.g. `['log2sigma', 'twoOmega']`. Use in combination with a 'return type function' to find the distortion values in the output.                                                                                                                                                                                                 | `DistortionMeasure[]` | `[]`                                               |
| `referenceScale`          | The reference area scaling (sigma) to take into account for certain distortion measures, notably `'log2sigma'`.                                                                                                                                                                                                                                                           | `number`              | `1`                                                |

#### Recursively adding midpoints

When transforming LineStrings and Polygons, it can happen that simply transforming every Point is not sufficient.

Two factors are at play which may require a more granular transformation: the transformation (which can be non-shape preserving, as is the case with all transformation in this package except for Helmert and 1st degree polynomial) or the geographic nature of the coordinates (where lines are generally meant as 'great arcs' but could be interpreted as lon-lat cartesian lines).

An algorithm will therefore recursively add midpoints in each segment (i.e. between two Points) to make the line more granular. A midpoint is added at the transformed middle Point of the original segment if the number of iterations is smaller than or equal to `maxDepth`, and if at least one of the following conditions are met:

* The ratio of (the distance between the middle Point of the transformed segment and the transformed middle Point of the original segment) to the length of the transformed segment, is larger than or equal to the specified `minOffsetRatio`.
* The distance between the middle Point of the transformed segment and the transformed middle Point of the original segment is larger than or equal to the specified `minOffsetDistance`.
* The transformed segment is larger than or equal to the specified `minLineDistance`.

Note that only one is met by default. Set a value to a number to opt in to a condition, set a value to `Infinity` to opt out of a condition.

The computation of the midpoints and distances in the source and destination domains during this process uses geometric algorithms, unless `sourceIsGeographic` or `destinationIsGeographic` are set to `true`, in which case geographic algorithms (such as 'Great-circle distance') are used.

#### Handedness

For some transformations, it is important that the source and destination planes have the same *handedness*.

When we consider 2D Cartesian planes, there are two types of 'handedness'. A Cartesian plane with the positive x-axis pointing right and the positive y-axis pointing up (and the x-axis being the 'first' and the y-axis the 'second' axis) is said to have *right-handed* orientation (also called *standard*, *positive* or *counter-clockwise*). This is for example the case in the equirectangular projection - at least if the coordinate order is (lon, lat). Alternatively, if the y-axis points downwards, we say the orientation is *left-handed* (or *negative* or *clock-wise*). This is for example the case for typical pixel coordinates, which have their origin in the top left corner.

The handedness of the source and destination can differ, for example if the source are pixels of an image and the destination are (lon, lat) coordinates (which is the typical case for Allmaps). For most transformation types solving the transformation happens independently for the x- and y-axis is, and hence it does not matter whether the source and destination are considered to have the same handedness or not: the same transformation parameters are obtained. For some transformations, like the Helmert transformation, the transformation of x- and y- coordinates are computed jointly (they are said to be 'coupled') and the difference matters. The algorithms won't produce the desired results unless action is taken to align the handedness.

Therefore, in case the handedness differs and this could matter, one can set the `differentHandedness` parameter to `true`. This will (not change the data itself, but) during computation of the transformation parameters and during evaluation of new inputs flip the y-axis of the source so as to align the handedness of both.

It is also possible to explicitly flip the y-axis of the output. This can be useful for example when transforming features backward from (lon, lat) coordinates to image coordinates (with `differentHandedness` set to `true` as it should be): when inspecting the resulting features in image space in an HTML-canvas, the results will display correctly since both the image and features are rendered according to the downward y-axis of the canvas. Some applications will, however, load images and vector features differently: QGIS (with the 'no-CRS' setting) for example loads vector features with an upward y-axis but images with a downward y-axis. For these special cases, (still set the `differentHandedness` set to `true` but also) use the 'return type function' as follows to make your resulting features overlap the image in the application you are using:

```ts
import { GcpTransformer } from '@allmaps/transform'

const generalGcps3 = ... // see above

const transformer = new GcpTransformer(generalGcps3, 'helmert', {
    differentHandedness: true
  })
const input = [4.925027120153211, 52.46506809004473]

const output = transformer.transformBackward([0, 0], {}, (generalGcp) => [
  generalGcp.source[0],
  -generalGcp.source[1]
])
// output = [146.25183291709982, -122.59989116975339]
// instead of [146.25183291709982, 122.59989116975339]
```

#### Distortions

Some transformations may induce distortions. Let's consider transforming an image to make this more visual. It we take a Helmert transformation of an image, we will see that it doesn't distort the image much: it will scale, rotate and translate the image, but not shear it (angles are preserved) - the only distortion applied is the scaling, and that scaling is the same everywhere across the image. If, on the other hand, we take a Thin Plate Spline transformation (with many GCPs) of that same image, we will see that the image will be distorted much, and will look like a rubber sheet which has been pulled and deformed in many different locations. Every pixel will be distorted in a unique way, such that both the areas and angles of the original image are not preserved.

We can compute these distortions locally, at every point. The approach implemented here is based on the theory of **'Differential Distortion Analysis'**: by evaluating the partial derivatives of the transformation function at every point we can compute local distortion measures from these derivatives, such as the **area distortion** `log2sigma` and **angular distortion** `twoOmega`. These will tell us how much the area and angles are distortion at every point. Thereafter averaging over all points can give un an indication of the overall distortion.

'Differential Distortion Analysis' was earlier implemented in [this](https://github.com/mclaeysb/distortionAnalysis) Matlab/Octave package following peer reviewed publications of both the theoretical approach an an application to a historical map.

This packages supports the evaluation of the partial derivatives in the `transformForward()` and `transformBackward()` functions via their transform options, and exports a function `computeDistortionFromPartialDerivatives()` to compute the distortion measures from these partial derivatives. The supported distortion measures are available via the exported `supportedDistortionMeasures` constant. These include:

| Key         | Type                               | Description                                                                                                                                                                                                                              | Example                                                                                                              |
|-------------|------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `log2sigma` | Area distortion measure            | The base-2 logarithm of the area scale factor σ, which indicates how much a local infinitesimal surface element is enlarged on the map (relative to the map’s scale).                                                                    | `0` for no area distortion, `1` if the area is twice as big, `-1` if the are is twice as small after transformation. |
| `twoOmega`  | Angular distortion measure         | The maximum angular distortion 2Ω, which indicated the maximal (taken over all possible angles between two direction from that point) difference between an angle before and after the transformation, making it a measure for shearing. | `0` for no angular distortion, `>0` for angular distortion.                                                          |
| `airyKavr`  | Airy-Kavrayskiy distortion measure | A measure combining the effects of areal and angular distortion.                                                                                                                                                                         | `0` for no distortion, `>0` for distortion.                                                                          |
| `signDetJ`  | Flip measure                       | The transformation's Jacobian determinant flipping sign, describing 'fold-over' of the transformation.                                                                                                                                   | `1` for no flip, `-1` for flip.                                                                                      |
| `thetaa`    | Tissot indicatrix axis             | The angle between the major axis of the Tissot indicatrix and the cartesian x-axis.                                                                                                                                                      | `0` for no rotation, `>0` for rotation.                                                                              |

Here's an example on how to compute local distortion.

```js
import { GcpTransformer } from '@allmaps/transform'

const gcps6 = ... // See above

// Obtain the referenceScale
const helmertTransformer = new GcpTransformer(gcps6, 'helmert')
const forwardHelmertTransformation = helmertTransformer.getForwardTransformation() as Helmert
const referenceScale = forwardHelmertTransformation.scale as number

const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
const input = [1000, 1000]
const distortion = transformer.transformForward(
        input,
        {
          distortionMeasures: ['log2sigma'],
          referenceScale
        },
        (generalGcp) => generalGcp.distortions.get('log2sigma')
      )
// distortion = 1.7800137112938559
// => At this input location the area has significantly expanded after the transformation
```

### Return Type Function

The 'return type function' (internally named `generalGcpToP` or `GcpToP`) allows to modify the type of data returned for each point.

An example will make this more clear: when forward-transforming a LineString, the input is a LineString in the source space and the (default) output is a LineString in the destination space (i.e. an Array of destination points). Using the 'return type function', you can make this output to be an Array of any function of objects of type GcpAndDistortions, which include the destination points, but also the corresponding source points and (if computed) the distortion information. By default this function this selects the destination points, and hence returns an Array of Points, but you can pass a function `(generalGcpToP) => generalGcpToP` to return an Array of  GcpAndDistortions objects, or you can pass more complex function on this object as well. This can be useful in several cases:

* When you want to refine an input geometry using a transformation but are interested in the coordinates of the refined geometry in the input domain more then those in the output domain.
* When you want to read out distortion information at each point (see the options for how to specify which distortions measures to compute).
* When you want to apply a transformation on the outputs point, e.g. flip the output points around their y-axis (see the notes on handedness for example of the latter).

## Typing

For geometries and other types, the same types as in [@allmaps/types](../../packages/types/) are used.

For GCPs, some generalisations have been added:

GCPs can be supplied as an array of objects containing `source` and `destination` coordinates:

```ts
type GeneralGcp = {
  source: [number, number]
  destination: [number, number]
}
```

Or you can supply an array of objects containing `resource` and `geo` coordinates. This is the format used in [Georeference Annotations](https://iiif.io/api/extension/georef/):

```ts
type Gcp = {
  resource: [number, number]
  geo: [number, number]
}
```

The return type functions work on the types GeneralGcpAndDistortions and GcpAndDistortions, defined as follows:

```ts
export type Distortions = {
  partialDerivativeX: Point
  partialDerivativeY: Point
  distortions: Map<DistortionMeasure, number>
  distortion: number
}

export type GeneralGcpAndDistortions = GeneralGcp & Partial<Distortions>
export type GcpAndDistortions = Gcp & Partial<Distortions>
```

## Transform vs. GDAL

The transformation algorithms of this package correspond to those of **GDAL** and the results are (nearly) identical. See the [tests](./test/test-transform.js) for details.

For a little history: this library started out as a JavaScript port of [gdaltransform](https://gdal.org/programs/gdaltransform.html) (as described in [this notebook](https://observablehq.com/@bertspaan/gdaltransform?collection=@bertspaan/iiif-maps)) and initially only implemented polynomial transformations of order 1. Later Thin Plate Spline transformations were added (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) amongst other transformations, which lead to a refactoring using the [`ml-matrix`](https://github.com/mljs/matrix) library. This library is used for creating and solving the linear systems of equations that are at the heart of each of each of these transformations.

## CLI

The [@allmaps/cli](../../apps/cli/) package creates and interface for four specific use cases:

* Transforming points to points.
* Transforming **SVG** geometries from the resource coordinates space of a IIIF resource to **GeoJSON** objects in the geo coordinate space of an interactive map.
* Transforming **GeoJSON** objects from the geo coordinate space of an interactive map to **SVG** objects in the resource coordinates space of a IIIF resource, **given (the GCPs and transformation type from) a Georeference Annotation**
* Vice versa: transforming **SVG** objects from the resource coordinates to **GeoJSON** objects in the geo coordinate space.
* Transforming the **SVG resource mask** included in a Georeference Annotation to a GeoJSON Polygon.

## Benchmark

Here are some benchmarks on building and using a transformer, as computed on a 2023 MacBook Air M2.

Creating a transformer (with 10 points) (and transform 1 point)

| Type              | Options    | Ops/s  |
|-------------------|------------|--------|
| `helmert`         |            | 63499  |
| `polynomial`      | `order: 1` | 133824 |
| `polynomial`      | `order: 2` | 66501  |
| `polynomial`      | `order: 3` | 26750  |
| `thinPlateSpline` |            | 20487  |
| `projective`      |            | 27581  |

Using a transformer (with 10 points) to transform 1 point

| Type              | Options    | Ops/s    |
|-------------------|------------|----------|
| `helmert`         |            | 21612153 |
| `polynomial`      | `order: 1` | 19993234 |
| `polynomial`      | `order: 2` | 19887376 |
| `polynomial`      | `order: 3` | 3930665  |
| `thinPlateSpline` |            | 2931361  |
| `projective`      |            | 20386139 |

See [`./bench/index.js`](`./bench/index.js`).

The benchmark can be run with `pnpm run bench`.

## API

### `DistortionMeasure`

###### Type

```ts
'log2sigma' | 'twoOmega' | 'airyKavr' | 'signDetJ' | 'thetaa'
```

### `Distortions`

###### Fields

* `distortion` (`number`)
* `distortions` (`Map<DistortionMeasure, number>`)
* `partialDerivativeX` (`[number, number]`)
* `partialDerivativeY` (`[number, number]`)

### `GcpAndDistortions`

###### Type

```ts
Gcp & Partial<Distortions>
```

### `new GcpTransformer(gcps, type, options)`

Create a GcpTransformer

###### Parameters

* `gcps` (`Array<GeneralGcp> | Array<Gcp>`)
  * An array of Ground Control Points (GCPs)
* `type` (`TransformationType | undefined`)
  * The transformation type
* `options?` (`Partial<TransformOptions> | undefined`)

###### Returns

`GcpTransformer`.

### `GcpTransformer#backwardTransformation?`

###### Type

```ts
Transformation
```

### `GcpTransformer#computeTransformation(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Transformation`.

### `GcpTransformer#destinationPoints`

###### Type

```ts
Array<Point>
```

### `GcpTransformer#forwardTransformation?`

###### Type

```ts
Transformation
```

### `GcpTransformer#gcps`

###### Type

```ts
Array<GeneralGcp>
```

### `GcpTransformer#getBackwardTransformation()`

Get backward transformation. Create if it doesn't exist yet.

###### Parameters

There are no parameters.

###### Returns

`Transformation`.

### `GcpTransformer#getForwardTransformation()`

Get forward transformation. Create if it doesn't exist yet.

###### Parameters

There are no parameters.

###### Returns

`Transformation`.

### `GcpTransformer#options`

###### Type

```ts
{
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  maxDepth: number
  sourceIsGeographic: boolean
  destinationIsGeographic: boolean
  differentHandedness: boolean
  distortionMeasures: DistortionMeasure[]
  referenceScale: number
} & ConversionOptions
```

### `GcpTransformer#sourcePoints`

###### Type

```ts
Array<Point>
```

### `GcpTransformer#transformBackward(point, options, generalGcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `options?` (`Partial<TransformOptions> | undefined`)
* `generalGcpToP?` (`((generalGcp: GeneralGcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GcpTransformer#transformForward(point, options, generalGcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `options?` (`Partial<TransformOptions> | undefined`)
* `generalGcpToP?` (`((generalGcp: GeneralGcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GcpTransformer#transformToGeo(point, options, gcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `options?` (`Partial<TransformOptions> | undefined`)
* `gcpToP?` (`((gcp: GcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GcpTransformer#transformToResource(point, options, gcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `options?` (`Partial<TransformOptions> | undefined`)
* `gcpToP?` (`((gcp: GcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GcpTransformer#type`

###### Type

```ts
  | 'straight'
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'projective'
  | 'thinPlateSpline'
```

### `GcpTransformer.transformGeojsonFeatureCollectionToSvgString(transformer, geojson, options)`

Transforms a GeoJSON FeatureCollection to resource space to a SVG string

This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
Note: Multi-geometries are not supported

###### Parameters

* `transformer` (`GcpTransformer`)
  * A GCP Transformer defining the transformation
* `geojson` (`{type: 'FeatureCollection'; features: GeojsonFeature[]}`)
  * GeoJSON FeatureCollection to transform
* `options?` (`Partial<TransformOptions> | undefined`)
  * Transform options

###### Returns

Input GeoJSON FeaturesCollection transformed to resource space, as SVG string (`string`).

### `GcpTransformer.transformGeojsonToSvg(transformer, geojsonGeometry, options)`

Transforms a GeoJSON Geometry to resource space to a SVG geometry

This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
Note: Multi-geometries are not supported

###### Parameters

* `transformer` (`GcpTransformer`)
  * A GCP Transformer defining the transformation
* `geojsonGeometry` (`  | GeojsonPoint
    | GeojsonLineString
    | GeojsonPolygon
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon`)
  * GeoJSON Geometry to transform
* `options?` (`Partial<TransformOptions> | undefined`)
  * Transform options

###### Returns

Input GeoJSON Geometry transform to resource space, as SVG geometry (`SvgCircle | SvgLine | SvgPolyLine | SvgRect | SvgPolygon`).

### `GcpTransformer.transformSvgStringToGeojsonFeatureCollection(transformer, svg, options)`

Transforms an SVG string to geo space to a GeoJSON FeatureCollection

This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
Note: Multi-geometries are not supported

###### Parameters

* `transformer` (`GcpTransformer`)
  * A GCP Transformer defining the transformation
* `svg` (`string`)
  * An SVG string to transform
* `options?` (`Partial<TransformOptions> | undefined`)
  * Transform options

###### Returns

Input SVG string transformed to geo space, as a GeoJSON FeatureCollection (`{type: 'FeatureCollection'; features: GeojsonFeature[]}`).

### `GcpTransformer.transformSvgToGeojson(transformer, svgCircle, options)`

Transforms a SVG geometry to geo space as a GeoJSON Geometry

This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
Note: Multi-geometries are not supported

###### Parameters

* `transformer` (`GcpTransformer`)
  * A GCP Transformer defining the transformation
* `svgCircle` (`{type: 'circle'; attributes?: SvgAttributes; coordinates: Point}`)
* `options?` (`Partial<TransformOptions> | undefined`)
  * Transform options

###### Returns

Input SVG geometry transformed to geo space, as a GeoJSON Geometry (`{type: 'Point'; coordinates: Point}`).

### `GeneralGcp`

###### Fields

* `destination` (`[number, number]`)
* `source` (`[number, number]`)

### `GeneralGcpAndDistortions`

###### Type

```ts
GeneralGcp & Partial<Distortions>
```

### `new Helmert(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Helmert`.

###### Extends

* `Transformation`

### `Helmert#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Helmert#evaluatePartialDerivativeX(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Helmert#evaluatePartialDerivativeY(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Helmert#helmertParameters`

###### Type

```ts
Array<number>
```

### `Helmert#helmertParametersMatrix`

###### Type

```ts
Matrix
```

### `Helmert#rotation`

###### Type

```ts
number
```

### `Helmert#scale`

###### Type

```ts
number
```

### `Helmert#translation`

###### Type

```ts
[number, number]
```

### `KernelFunction`

###### Type

```ts
(r: number, options: KernelFunctionOptions) => number
```

### `KernelFunctionOptions`

###### Fields

* `derivative?` (`number`)
* `epsilon?` (`number`)

### `NormFunction`

###### Type

```ts
(point0: Point, point1: Point) => number
```

### `new Polynomial(sourcePoints, destinationPoints, order)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)
* `order?` (`number | undefined`)

###### Returns

`Polynomial`.

###### Extends

* `Transformation`

### `Polynomial#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial#evaluatePartialDerivativeX(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial#evaluatePartialDerivativeY(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial#order`

###### Type

```ts
number
```

### `Polynomial#pointCountMinimum`

###### Type

```ts
number
```

### `Polynomial#polynomialParameters`

###### Type

```ts
[Array<number>, Array<number>]
```

### `Polynomial#polynomialParametersMatrices`

###### Type

```ts
[Matrix, Matrix]
```

### `Polynomial#rotation?`

###### Type

```ts
number
```

### `Polynomial#scale?`

###### Type

```ts
[number, number]
```

### `Polynomial#shear?`

###### Type

```ts
[number, number]
```

### `Polynomial#translation?`

###### Type

```ts
[number, number]
```

### `new Projective(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Projective`.

###### Extends

* `Transformation`

### `Projective#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Projective#evaluatePartialDerivativeX(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Projective#evaluatePartialDerivativeY(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Projective#projectiveParameters`

###### Type

```ts
Array<Array<number>>
```

### `Projective#projectiveParametersMatrix`

###### Type

```ts
Matrix
```

### `new RBF(sourcePoints, destinationPoints, kernelFunction, normFunction, epsilon)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)
* `kernelFunction` (`(r: number, options: KernelFunctionOptions) => number`)
* `normFunction` (`(point0: Point, point1: Point) => number`)
* `epsilon?` (`number | undefined`)

###### Returns

`RBF`.

###### Extends

* `Transformation`

### `RBF#affineWeights`

###### Type

```ts
[Array<number>, Array<number>]
```

### `RBF#epsilon?`

###### Type

```ts
number
```

### `RBF#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `RBF#evaluatePartialDerivativeX(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `RBF#evaluatePartialDerivativeY(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `RBF#kernelFunction`

###### Type

```ts
(r: number, options: KernelFunctionOptions) => number
```

### `RBF#normFunction`

###### Type

```ts
(point0: Point, point1: Point) => number
```

### `RBF#rbfWeights`

###### Type

```ts
[Array<number>, Array<number>]
```

### `RBF#weightsMatrices`

###### Type

```ts
[Matrix, Matrix]
```

### `RefinementOptions`

###### Fields

* `destinationDistanceFunction` (`(p0: Point, p1: Point) => number`)
* `destinationMidPointFunction` (`(p0: Point, p1: Point) => Point`)
* `maxDepth` (`number`)
* `minLineDistance` (`number`)
* `minOffsetDistance` (`number`)
* `minOffsetRatio` (`number`)
* `sourceMidPointFunction` (`(p0: Point, p1: Point) => Point`)

### `SplitGcpLineInfo`

###### Fields

* `destinationLineDistance` (`number`)
* `destinationMidPointsDistance` (`number`)
* `destinationRefinedLineDistance` (`number`)

### `SplitGcpLinePointInfo`

###### Type

```ts
SplitGcpLineInfo & {
  sourceMidPoint: Point
  destinationMidPointFromRefinementFunction: Point
}
```

### `new Straight(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Straight`.

###### Extends

* `Transformation`

### `Straight#destinationPointsCenter`

###### Type

```ts
[number, number]
```

### `Straight#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Straight#evaluatePartialDerivativeX(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Straight#evaluatePartialDerivativeY(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Straight#scale?`

###### Type

```ts
number
```

### `Straight#sourcePointsCenter`

###### Type

```ts
[number, number]
```

### `Straight#translation?`

###### Type

```ts
[number, number]
```

### `TransformOptions`

###### Type

```ts
{
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  maxDepth: number
  sourceIsGeographic: boolean
  destinationIsGeographic: boolean
  differentHandedness: boolean
  distortionMeasures: DistortionMeasure[]
  referenceScale: number
} & ConversionOptions
```

### `new Transformation(sourcePoints, destinationPoints, type, pointCountMinimum)`

Create a transformation

###### Parameters

* `sourcePoints` (`Array<Point>`)
  * The source points
* `destinationPoints` (`Array<Point>`)
  * The destination points
* `type` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'projective'
    | 'thinPlateSpline'`)
  * The transformation type
* `pointCountMinimum` (`number`)
  * The minimum number of points for the transformation type

###### Returns

`Transformation`.

### `Transformation#computeDestinationTransformedSourcePoints()`

###### Parameters

There are no parameters.

###### Returns

`Array<Point>`.

### `Transformation#destinationPoints`

###### Type

```ts
Array<Point>
```

### `Transformation#destinationTransformedSourcePoints?`

###### Type

```ts
Array<Point>
```

### `Transformation#errors`

###### Type

```ts
Array<number>
```

### `Transformation#evaluateFunction(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Transformation#evaluatePartialDerivativeX(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Transformation#evaluatePartialDerivativeY(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Transformation#pointCount`

###### Type

```ts
number
```

### `Transformation#pointCountMinimum`

###### Type

```ts
number
```

### `Transformation#rmse`

###### Type

```ts
number
```

### `Transformation#sourcePoints`

###### Type

```ts
Array<Point>
```

### `Transformation#type`

###### Type

```ts
string
```

### `TransformationType`

Transformation type.

###### Type

```ts
  | 'straight'
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'projective'
  | 'thinPlateSpline'
```

### `computeDistortionsFromPartialDerivatives(distortionMeasures, partialDerivativeX, partialDerivativeY, referenceScale)`

Compute the distortion value of selected distortion measures from the partial derivatives at a specific point

###### Parameters

* `distortionMeasures` (`Array<DistortionMeasure>`)
  * The requested distortion measures
* `partialDerivativeX?` (`Point | undefined`)
  * The partial derivative to 'x' of the transformation, evaluated at a set point
* `partialDerivativeY?` (`Point | undefined`)
  * The partial derivative to 'y' of the transformation, evaluated at a set point
* `referenceScale` (`number | undefined`)
  * The reference area scaling (sigma) to take into account for certain distortion measures (like 'log2sigma'), e.g. computed via a helmert transform

###### Returns

A map of distortion measures and distortion values at the point (`Map<DistortionMeasure, number>`).

### `getForwardTransformResolution(bbox, transformer, partialTransformOptions)`

###### Parameters

* `bbox` (`[number, number, number, number]`)
* `transformer` (`GcpTransformer`)
* `partialTransformOptions` (`{ minOffsetRatio?: number | undefined; minOffsetDistance?: number | undefined; minLineDistance?: number | undefined; maxDepth?: number | undefined; sourceIsGeographic?: boolean | undefined; ... 4 more ...; isMultiGeometry?: false | undefined; }`)

###### Returns

`number | undefined`.

### `supportedDistortionMeasures`

###### Type

```ts
Array<string>
```
