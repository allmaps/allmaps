# @allmaps/transform

This module contains classes and methods to **transform Points, LineStrings, Polygons** and other spatial features from a 2D cartesian `(x, y)` source space to a destination space. The transformation function that accomplish this are constructed from **a set of Control Points**, who's coordinates are known in both spaces, and a specific **type of transformation** algorithm.

The classes in this module are further extended in the [@allmaps/project](../../packages/project/) module. If you're looking to build a *projected* transformer, transforming and projecting from the 'resource' space of a IIIF Image to the 'projected geospatial' space of a map projection, use the classes from that module. It can build Projected GCP Transformers from the Ground Control Points, transformation type and map projection definitions (e.g. defined in a map's Georeference Annotation).

## How it works

This package exports the `GeneralGcpTransformer` and `GcpTransformer` classes.

* A **General GCP Transformer** is useful in the general case: it takes in ground control points of the `GeneralGcp` type, with 'source' and 'destination' fields, and has methods `generalTransformer.transformForward()` to transform geometries from 'source' space to 'destination' space, and `generalTransformer.transformBackward()` to transform from 'destination' space to 'source' space.
* A **GCP Transformer** it useful in the typical Allmaps case: it takes in ground control points of the `Gcp` type, with 'resource' and 'geo' fields, and has methods `transformer.transformToGeo()` to transform geometries from 'resource' space to 'geo' space, and `transformer.transformToResource()` to transform from 'geo' space to 'resource' space. Apart from naming, there is also one default option set for this type of transformer: `differentHandedness = true` by default, since the most common case is that the resource space had a downward y-axis.

In both cases, calling a transform method will build a transformation of the specified type using the input GCPs, or use it if it already exists. These transformations can then transform points one by one. For lineStrings and polygons the transform options can be used to add extra mid-points to assure sufficiently smooth results.

As an **example** for the georeferenced map *L'Angleterre Novissima Descriptio Angliae Scotiae et Hiberniae* ([Open in Allmaps Viewer](https://viewer.allmaps.org/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F135dfd2d58dc26ec)): based on the map's GCPs in resource and (projected) geo coordinates, a GCP Transformer can be built (visualized by the grid) allowing to transform any geometry from resource to geo space. Here, the resource mask is transformed from resource to (projected) geo space.

![](https://github.com/allmaps/allmaps/blob/main/packages/transform/example.webp?raw=true)

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Install with npm:

```sh
npm install @allmaps/transform
```

## Usage

### Quickstart

When starting from an **Annotation** or **Georeferenced Map**, the fastest way to build a GCP Transformer is:

```js
import { parseAnnotation } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create a georeferencedMap from the annotation
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap = georeferencedMaps[0]

// Build GCP Transformer
const transformer = GcpTransformer.fromGeoreferencedMap(georeferencedMap)

// Use it to transform geometries, as below. E.g.:
const geoPoint = transformer.transformToGeo(resourcePoint)
```

This is equivalent to constructing a transformer from the Annotation's or Georeferenced Map's GCPs and transformation type, as in the examples below.

This transformer can then be used to transform geometries between 'resource' space and 'geo' space.

When **rendering** maps, another way to quickly obtain a transformer is to access it directly from a **Warped Map** in the renderer's Warped Map List:

```js
// Create a renderer from your canvas
const renderer = new WebGL2Renderer(gl)
// Fetch and parse annotations, add them to the renderer ...

// There are multiple ways to access the renderer's Warped Map List's Warped Maps, e.g.:
const warpedMap = renderer.warpedMapList.getWarpedMap(mapId)

// Access the Projected GCP Transformer, in the Warped Map's current transformation type
const projectedTransformer = warpedMap.projectedTransformer
// Or select or create the Projected GCP Transformer of a different transformation type
const projectedHelmertTransformer = warpedMap.getProjectedTransformer('helmert')
```

The transformer obtained in this way is a Projected GCP Transformer as detailed in [@allmaps/project](../../packages/project/). See also the [@allmaps/render](../../packages/render/) module for more about working with renderers.

Note: only GCP Transformers can be created in these ways. General GCP Transformers must be created using the constructor, as shown below.

### Point

In this example we use a general transformer to transform forward.

```js
import { GeneralGcpTransformer } from '@allmaps/transform'

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

const generalTransformer = new GeneralGcpTransformer(generalGcps3, 'polynomial')

const sourcePoint = [1, 1]

const destinationPoint = generalTransformer.transformForward(sourcePoint)
// destinationPoint = [6, 14]
```

### LineString

In this example we use a transformer to transform backward.

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

const resourceLineString = [
  [10, 50],
  [50, 50]
]

const geoLineString = transformer.transformBackward(resourceLineString, options)
// geoLineString = [
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

In this example we use a transformer to build a Thin Plate Spline transformation.

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

const resourcePolygon = [
  [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
]

const geoPolygon = transformer.transformForward(resourcePolygon, options)
// geoPolygon = [
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

In this example we use a transformer to transform a multi-geometry.

```js
import { GcpTransformer } from '@allmaps/transform'

const gcps7 = // see above

// The option `isMultiGeometry` assures the transform method recognises the input (an array of points) as a multiPoint, instead of a lineString
const options = {
  isMultiGeometry: true
}

const transformer = new GcpTransformer(gcps7, 'polynomial')

const resourceMultiPoint = [
  [10, 50],
  [50, 50]
]

const geoMultiPoint = transformer.transformForward(resourceMultiPoint, options)
// const geoMultiPoint = [
//   [31.06060606060611, 155.30303030303048],
//   [237.12121212121218, 185.60606060606085]
// ]
// Note: if the input would have been recognised as a lineString, more points would have been added!
```

## Creating a transformer

Let's go over the different steps of using this package: creating a transformer and using transformer methods.

A transformer is created from a set of **GCPs**, a **transformation type** and some optional **options**.

### GCPs

GCPs follow the `GeneralGcp` or `Gcp` type (see below) respectively. Each transformation type has a minimum number of GCPs.

Only **linearly independent control points** should be considered when checking if the criterion for the minimum number of control points is met. For example, three control points that are collinear (one the same line) only count as two linearly independent points. The current implementation doesn't check such linear (in)dependance, but building a transformer with insufficient linearly independent control points will result in a badly conditioned matrix (no error but diverging results) or non-invertible matrix (**error when inverting matrix**). See [@allmaps/analyse](../../packages/analyse/) for ways to analyse and check GCP properties.

### Transformation types

The following transformation types are supported.

|                                                                                                                 | Type                                       | Description                                                              | Properties                                                                                                                           | Minimum number of GCPs |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| <img width="100" src="../ui/src/lib/shared/images/transformations/straight.svg" alt="straight">                 | `straight`                                 | Straight transformation                                                  | Applies translation and scaling. Preserves shapes and angles.                                                                        | 2                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/helmert.svg" alt="helmert">                   | `helmert`                                  | Helmert transformation or 'similarity transformation'                    | Applies translation, scaling and rotation. Preserves shapes and angles.                                                              | 2                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/polynomial-1.svg" alt="polynomial">           | `polynomial` (default), also `polynomial1` | First order polynomial transformation                                    | Applies translation, scaling, rotation and shearing. Preserves lines and parallelism.                                                | 3                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/polynomial-2.svg" alt="polynomial2">          | `polynomial2`                              | Second order polynomial transformation.                                  | Applies second order effects. Adds some bending flexibility.                                                                         | 6                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/polynomial-3.svg" alt="polynomial3">          | `polynomial3`                              | Third order polynomial transformation                                    | Applies third order effects. Adds more bending flexibility.                                                                          | 10                     |
| <img width="100" src="../ui/src/lib/shared/images/transformations/thin-plate-spline.svg" alt="thinPlateSpline"> | `thinPlateSpline`                          | Thin Plate Spline transformation or 'rubber sheeting' (with affine part) | Applies smooth transformation. Transformation is 'exact' at GPCs. (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) | 3                      |
| <img width="100" src="../ui/src/lib/shared/images/transformations/projective.svg" alt="projective">             | `projective`                               | Projective or 'perspective' transformation, used for aerial images       | Follow perspective rules. Preserves lines and cross-ratios.                                                                          | 4                      |

### Transformer options

When creating a transformer, 'transformer options' can be specified. Apart from the options below, any 'transform options' (e.g. `maxDepth`) specified when creating a transformer will become the default options, used when calling a transform method.

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `differentHandedness`     | Whether one of the axes should be flipped (internally) while computing the transformation parameters. Should be true if the handedness differs between the source and destination coordinate spaces. This makes a difference for specific transformation types like the Helmert transform. (Flipping will not alter the axis orientation of the output (use the 'return type function' for this)). | `boolean`             | `false` for General GCP Transformer, `true` for GCP Transformer

#### Handedness

For some transformation types, it is important that the source and destination planes have the same *handedness*.

When we consider 2D Cartesian planes, there are two types of 'handedness'. A Cartesian plane with the positive x-axis pointing right and the positive y-axis pointing up (and the x-axis being the 'first' and the y-axis the 'second' axis) is said to have *right-handed* orientation (also called *standard*, *positive* or *counter-clockwise*). This is for example the case in the equirectangular projection - at least if the coordinate order is (lon, lat). Alternatively, if the y-axis points downwards, we say the orientation is *left-handed* (or *negative* or *clock-wise*). This is for example the case for typical pixel coordinates, which have their origin in the top left corner.

The handedness of the source and destination can differ, for example if the source are pixels of an image and the destination are (lon, lat) coordinates (which is the typical case for Allmaps). For most transformation types solving the transformation happens independently for the x- and y-axis is, and hence it does not matter whether the source and destination are considered to have the same handedness or not: the same transformation parameters are obtained. For some transformations, like the Helmert transformation, the transformation of x- and y- coordinates are computed jointly (they are said to be 'coupled') and the difference matters. The algorithms won't produce the desired results unless action is taken to align the handedness.

Therefore, in case the handedness differs and this could matter, one can set the `differentHandedness` parameter to `true`. This will (not change the data itself, but) during computation of the transformation parameters and during evaluation of new inputs flip the y-axis of the source so as to align the handedness of both.

In addition, it is also possible to *explicitly* flip the y-axis of the output. This can be useful for example when transforming features backward from (lon, lat) coordinates to image coordinates (with `differentHandedness` set to `true` as it should be): when inspecting the resulting features in image space in an HTML-canvas, the results will display correctly since both the image and features are rendered according to the downward y-axis of the canvas. Some applications will, however, load images and vector features differently: QGIS (with the 'no-CRS' setting) for example loads vector features with an upward y-axis but images with a downward y-axis. For these special cases, (still set the `differentHandedness` set to `true` but also) use the 'return type function' as follows to make your resulting features overlap the image in the application you are using:

```ts
import { GeneralGcpTransformer } from '@allmaps/transform'

const generalGcps3 = ... // see above

const transformer = new GeneralGcpTransformer(generalGcps3, 'helmert', {
    differentHandedness: true
  })
const destinationPoint = [4.925027120153211, 52.46506809004473]

const sourcePoint = transformer.transformBackward(destinationPoint, {}, (generalGcp) => [
  generalGcp.source[0],
  -generalGcp.source[1]
])
// sourcePoint = [146.25183291709982, -122.59989116975339]
// instead of [146.25183291709982, 122.59989116975339]
```

## Using transformer methods

Once a transformer is built, its methods can be used to transform geometries from one space to the other. Transformer methods take a **Geometry**, some optional **options** and an optional **'return type function'**.

There are separate methods for transforming one way or the other between the two spaces: a General GCP Transformer has methods `transformForward()` and `transformBackward()`, a GCP Transformer has methods `transformToGeo()` and `transformToResource()`.

These methods accepts Points, LineStrings as well as Polygons (and MultiPoints, MultiLineStrings and MultiPolygons) geometries (as defined in [@allmaps/types](../../packages/types/)).

Note that the 'backward' (or 'toResource') methods are in general **not the exact inverse** of the 'forward' (or 'toGeo') methods. They are different function created by interpreting the GCPs in the one sense or the other. In some exceptional cases (like for 1st order polynomial transformations with exactly 3 GCPs) the backwards method is the exact inverse. In some cases, the exact inverse can be computed using some simple math from the transformation parameters (like for general 1st order polynomial transformations). In other cases, an exact inverse function could be obtained by implementing stepwise approximation of the inverse function (e.g. gradient descent).

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
const geoLineString = geojsonGeometryToGeometry(geojsonLineString)
// geoLineString = [[10, 50],[50, 50]]

const resourceLineString = transformer.transformToResource(
  geoLineString,
  options
)
const resourceLineStringAsGeojson = geometryToGeojsonGeometry(resourceLineString)
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

Some 'transform options' are available when we transform geometries:

The 'transform options' for a General GCP Transformer methods and a GCP Transformer methods are similar but may have different names. When this is the case this is reflected in the table below.

| Option                                                                                                       | Description                                                                                                                                                                                                                                                                  | Type                  | Default                                            |
| :----------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :------------------------------------------------- |
| `maxDepth`                                                                                                   | Maximum recursion depth when recursively adding midpoints (higher means more midpoints)                                                                                                                                                                                      | `number`              | `0` (i.e. no midpoints by default!)                |
| `minOffsetRatio`                                                                                             | Minimum offset ratio when recursively adding midpoints (lower means more midpoints)                                                                                                                                                                                          | `number`              | `0`                                                |
| `minOffsetDistance`                                                                                          | Minimum offset distance when recursively adding midpoints (lower means more midpoints)                                                                                                                                                                                       | `number`              | `Infinity` (i.e. condition not applied by default) |
| `minLineDistance`                                                                                            | Minimum line distance when recursively adding midpoints (lower means more midpoints)                                                                                                                                                                                         | `number`              | `Infinity` (i.e. condition not applied by default) |
| `sourceIsGeographic` (not available for GCP Transformer methods)                                             | Use geographic distances and midpoints in 'source' domain in lon-lat WGS84.                                                                                                                                                                                                  | `boolean`             | `false`                                            |
| `destinationIsGeographic` for General GCP Transformer methods, `geoIsGeographic` for GCP Transformer methods | Use geographic distances and midpoints in 'destination' ('geo') domain in lon-lat WGS84.                                                                                                                                                                                     | `boolean`             | `false`                                            |
| `distortionMeasures`                                                                                         | A list of distortion measures to compute. E.g. `['log2sigma', 'twoOmega']`. Use in combination with a 'return type function' to find the distortion values in the output.                                                                                                    | `DistortionMeasure[]` | `[]`                                               |
| `referenceScale`                                                                                             | The reference area scaling (sigma) to take into account for certain distortion measures, notably `'log2sigma'`.                                                                                                                                                              | `number`              | `1`                                                |
| `isMultiGeometry`                                                                                            | Whether the input should be considered as a MultiPoint, MultiLineString or MultiPolygon. This is necessary since the standard geometry types are not deterministic: the types of LineString and MultiPoint are identical.                                                    | `boolean`             | `false`                                            |
| `preForward` (not available for GCP Transformer methods)                                                     | A projection function to be applied to the General GCP 'source' (GCP 'resource') points before building a transformation, and to be applied during a 'forward' transform before evaluating the 'forward' transformation at the input points.                                 | `Projection Function` | Identity projection `(point: Point) => point`      |
| `postForward` for General GCP Transformer methods, `postToGeo` for GCP Transformer methods                   | A projection function to be applied during a 'forward' ('toGeo') transform after evaluating the 'forward' ('toGeo') transformation.                                                                                                                                          | `Projection Function` | Identity projection `(point: Point) => point`      |
| `preBackward` for General GCP Transformer methods, `preToResource` for GCP Transformer methods               | A projection function to be applied to the General GCP 'destination' (GCP 'geo') points before building a transformation, and to be applied during a 'backward' ('toResource') transform before evaluating the 'backward' ('toResource') transformation at the input points. | `Projection Function` | Identity projection `(point: Point) => point`      |
| `postBackward` (not available for GCP Transformer methods)                                                   | A projection function to be applied during a 'backward' transform after evaluating the 'backward' transformation.                                                                                                                                                            | `Projection Function` | Identity projection `(point: Point) => point`      |

#### Recursively adding midpoints

When transforming LineStrings and Polygons, it can happen that simply transforming every Point is not sufficient.

Two factors are at play which may require a more granular transformation: the transformation (which can be non-shape preserving, as is the case with all transformation in this package except for Helmert and 1st degree polynomial) or the geographic nature of the coordinates (where lines are generally meant as 'great arcs' but could be interpreted as lon-lat cartesian lines).

An algorithm will therefore recursively add midpoints in each segment (i.e. between two Points) to make the line more granular. A midpoint is added at the transformed middle Point of the original segment if the number of iterations is smaller than or equal to `maxDepth`, and if at least one of the following conditions are met:

* The ratio of (the distance between the middle Point of the transformed segment and the transformed middle Point of the original segment) to the length of the transformed segment, is larger than or equal to the specified `minOffsetRatio`.
* The distance between the middle Point of the transformed segment and the transformed middle Point of the original segment is larger than or equal to the specified `minOffsetDistance`.
* The transformed segment is larger than or equal to the specified `minLineDistance`.

Note that only one is met by default. Set a value to a number to opt in to a condition, set a value to `Infinity` to opt out of a condition.

The computation of the midpoints and distances in the source and destination domains during this process uses geometric algorithms, unless `sourceIsGeographic` or `destinationIsGeographic` are set to `true`, in which case geographic algorithms (such as 'Great-circle distance') are used.

#### Distortions

Some transformations may induce distortions. Let's consider transforming an image to make this more visual. It we take a Helmert transformation of an image, we will see that it doesn't distort the image much: it will scale, rotate and translate the image, but not shear it (angles are preserved) - the only distortion applied is the scaling, and that scaling is the same everywhere across the image. If, on the other hand, we take a Thin Plate Spline transformation (with many GCPs) of that same image, we will see that the image will be distorted much, and will look like a rubber sheet which has been pulled and deformed in many different locations. Every pixel will be distorted in a unique way, such that both the areas and angles of the original image are not preserved.

We can compute these distortions locally, at every point. The approach implemented here is based on the theory of **'Differential Distortion Analysis'**: by evaluating the partial derivatives of the transformation function at every point we can compute local distortion measures from these derivatives, such as the **area distortion** `log2sigma` and **angular distortion** `twoOmega`. These will tell us how much the area and angles are distortion at every point. Thereafter averaging over all points can give un an indication of the overall distortion.

'Differential Distortion Analysis' was earlier implemented in [this](https://github.com/mclaeysb/distortionAnalysis) Matlab/Octave package following peer reviewed publications of both the theoretical approach an an application to a historical map.

The supported distortion measures are available via the exported `supportedDistortionMeasures` constant. These include:

| Key         | Type                               | Description                                                                                                                                                                                                                              | Example                                                                                                              |
| ----------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `log2sigma` | Area distortion measure            | The base-2 logarithm of the area scale factor σ, which indicates how much a local infinitesimal surface element is enlarged on the map (relative to the map’s scale).                                                                    | `0` for no area distortion, `1` if the area is twice as big, `-1` if the are is twice as small after transformation. |
| `twoOmega`  | Angular distortion measure         | The maximum angular distortion 2Ω, which indicated the maximal (taken over all possible angles between two direction from that point) difference between an angle before and after the transformation, making it a measure for shearing. | `0` for no angular distortion, `>0` for angular distortion.                                                          |
| `airyKavr`  | Airy-Kavrayskiy distortion measure | A measure combining the effects of areal and angular distortion.                                                                                                                                                                         | `0` for no distortion, `>0` for distortion.                                                                          |
| `signDetJ`  | Flip measure                       | The transformation's Jacobian determinant flipping sign, describing 'fold-over' of the transformation.                                                                                                                                   | `1` for no flip, `-1` for flip.                                                                                      |
| `thetaa`    | Tissot indicatrix axis             | The angle between the major axis of the Tissot indicatrix and the cartesian x-axis.                                                                                                                                                      | `0` for no rotation, `>0` for rotation.                                                                              |

To compute distortion measures, specify the requested measures in the transform options and read the values using the 'return type function':

```js
import { GcpTransformer } from '@allmaps/transform'

const gcps6 = ... // See above

// Obtain the referenceScale
const helmertTransformer = new GcpTransformer(gcps6, 'helmert')
const toGeoHelmertTransformation = helmertTransformer.getToGeoTransformation()
const referenceScale = toGeoHelmertTransformation.getMeasures().scale

const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
const resourcePoint = [1000, 1000]
const distortion = transformer.transformToGeo(
    resourcePoint,
    {
      distortionMeasures: ['log2sigma'],
      referenceScale
    },
    (gcpAndDistortions) => gcpAndDistortions.distortions.get('log2sigma')
)
// distortion = -0.2140907145956012
// => At this resource location the area has slightly contracted after the transformation
```

### Projections

The (forward and backward) transformations underlying the the General GCP Transformer and GCP Transformer are map-projection agnostic: they describe a transformation for one cartesian `(x, y)` plane to another.

If you need to deal with simple map projection situation, e.g. when you are given GCPs in a lon-lat WGS84 geographic projection but want to build a GCP Transformer to WebMercator (as a guess for the map's projection and as the projection of the viewport to render in), you could simply project your GCPs from WGS84 to WebMercator first and build a projected transformed from these projected GCPs.

To deal with more complex general projection situations, the transform options includes optional projection functions. This is useful when the transformation should be computed between 'internal' projected spaces that are different than the 'source' and 'destination' spaces of the GCPs. These functions are `preForward`, `postForward` (`postToGeo`), `preBackward` (`preToResource`) and `postBackward`. When set, these are applied when reading the GCPs to form the 'internal' GCPs (`preForward` is applied to the source coordinates and `preBackward` to destination coordinates). They are also applied on each corresponding transform call before and after the transformation is evaluated: a `transformForward()` call thus applies `preForward`, evaluates the forward transformation, and finally applies `postForward`.

To make this general case more concrete, here's how this is works **in the Allmaps case**. Allmaps uses a GCP Transformer and transforms from the 'resource' space of an image of a map to a 'projected geo' space of the viewport to render the map. Not only is the viewport a projected space, but it is also possible that the user knows or supposes the geographic projection in which the map is made, and that this geographic projection is different than the geographic projection of the viewport. In that case one wants to build a transformation between the 'resource' space of pixels and an 'internal projected geo' space of the maps geographic projection. When transforming to geo, one wants to first evaluate this transformation (from 'resource' to 'internal projected geo') and then apply a `postForward` projection function from 'internal projected geo' space to 'projected geo' space.

The crucial insight here is that the map's geographic projection *can* be different than the rendered geographic projection. The first inspires a internal projected space to use when computing the transformation, which will assure that the transformation only takes into account the warping between these two spaces, and ideally, when our information or guess about the map's geographic projection is correct, does not account for warping due to the projections. The latter must be taken into account later, and handles the warping due to the difference in geographic projections. By doing *both within* a transformer, one can use the transformer methods to transform geometries forward or backward (or compute a resolution), and know that our geometries will be refined both by the transformation and the projection functions!

To simplify the computation of these optional projection functions from the map's geographic projection and viewport geographic projection, use the class **Projected GCP Transformer** from the [@allmaps/project](../../packages/project/) module.

The optional projection functions are part of the transform options to allow them to be specified not just at the construction of a transformer but for any transform call. Since they are also applied at construction when reading the GCPs, be careful when specifying such a function in a transform call. In a Projected GCP Transformer, the use-case for specifying a different projection in a transform call (and reusing existing the transformation!) has been implemented with care and can be used safely.

Note: there is one other place where projections matter: the `destinationIsGeographic`/`geoIsGeographic` and `sourceIsGeographic` options should only be used when the corresponding coordinates are in lon-lat WGS84 geographic projection. When using these options, coordinates are considered lying on a sphere and geographic distances and midpoints are computed using great arcs (rather than using geometric distances and midpoints on a projected space).

### Return Type Function

The 'return type function' (internally named `generalGcpToP` or `GcpToP`) allows to modify the type of data returned for each point.

An example will make this more clear: when using a General GCP Transformer to forward-transform a LineString, the input is a LineString in the source space and the (default) output is a LineString in the destination space (i.e. an Array of destination points). Using the 'return type function', you can make this output to be an Array of any function of objects of type GeneralGcpAndDistortions, which include the destination points, but also the corresponding source points and (if computed) the distortion information. By default this function selects the destination points, and hence returns an Array of Points, but you can pass a function `(generalGcpToP) => generalGcpToP` to return an Array of GcpAndDistortions objects, or you can pass more complex function on this object as well. This can be useful in several cases:

* When you want to refine an input geometry using a transformation but are interested in the coordinates of the refined geometry in the input domain more than those in the output domain.
* When you want to read out distortion information at each point (see the options for how to specify which distortions measures to compute).
* When you want to apply a transformation on the outputs point, e.g. flip the output points around their y-axis (see the notes on handedness for example of the latter).

## Typing

For geometries and other types, the same types as in [@allmaps/types](../../packages/types/) are used.

For GCPs, some generalisations have been added:

For a General GCP Transformer, control points can be supplied as an array of objects containing `source` and `destination` coordinates:

```ts
type GeneralGcp = {
  source: [number, number]
  destination: [number, number]
}
```

For a GCP Transformer, supply the control points as an array of objects containing `resource` and `geo` coordinates. This is the format used in [Georeference Annotations](https://iiif.io/api/extension/georef/):

```ts
type Gcp = {
  resource: [number, number]
  geo: [number, number]
}
```

The return type functions work on the types `GeneralGcpAndDistortions` and `GcpAndDistortions`, defined as follows:

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

Projection functions are defined as follows

```ts
export type ProjectionFunction = (point: Point) => Point
```

## Transform vs. GDAL

The transformation algorithms of this package correspond to those of **GDAL** and the results are (nearly) identical. See the [tests](./test/test-transform.js) for details.

For a little history: this library started out as a JavaScript port of [gdaltransform](https://gdal.org/programs/gdaltransform.html) (as described in [this notebook](https://observablehq.com/@bertspaan/gdaltransform?collection=@bertspaan/iiif-maps)) and initially only implemented polynomial transformations of order 1. Later Thin Plate Spline transformations were added (see [this notebook](https://observablehq.com/d/0b57d3b587542794)) amongst other transformations, which lead to a refactoring using the [`ml-matrix`](https://github.com/mljs/matrix) library. This library is used for creating and solving the linear systems of equations that are at the heart of each of each of these transformations.

## CLI

The [@allmaps/cli](../../apps/cli/) package creates and interface for some specific use cases:

* Transforming **coordinates** from point to point.
* Transforming **SVG** geometries from the resource coordinates space of a IIIF resource to GeoJSON objects in the geo coordinate space of an interactive map, using the GCPs and transformation type specified in a Georeference Annotation.
* Transforming **GeoJSON** objects from the geo coordinate space of an interactive map to SVG objects in the resource coordinates space of a IIIF resource, using the GCPs and transformation type specified in a Georeference Annotation.
* Transforming the **resource mask** of a Georeference Annotation from the resource coordinates space to a GeoJSON polygon in the geo coordinate space.

## Benchmark

Here are some benchmarks on building and using a transformer, as computed on a 2023 MacBook Air M2 with 16 GB RAM.

This benchmark can be run with `pnpm run bench`. For more information, see [`./bench/index.js`](`./bench/index.js`).

To create a transformer (with 10 points) and compute its 'toGeo' transformation:

| Type            | Ops/s  |
|-----------------|--------|
| helmert         | 68455  |
| polynomial1     | 117899 |
| polynomial2     | 68981  |
| polynomial3     | 30239  |
| thinPlateSpline | 32927  |
| projective      | 28530  |

To use a transformer (with 10 points, and its 'toGeo' transformation already computed) and transform a point 'toGeo':

| Type            | Ops/s    |
|-----------------|----------|
| helmert         | 17049083 |
| polynomial1     | 17568448 |
| polynomial2     | 17007445 |
| polynomial3     | 3774792  |
| thinPlateSpline | 2933006  |
| projective      | 16462262 |

## License

MIT

## API

### `new BaseIndependentLinearWeightsTransformation(sourcePoints, destinationPoints, type, pointCountMinimum)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)
* `type` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)
* `pointCountMinimum` (`number`)

###### Returns

`BaseIndependentLinearWeightsTransformation`.

###### Extends

* `BaseLinearWeightsTransformation`

### `BaseIndependentLinearWeightsTransformation#coefsArrayMatrices`

###### Type

```ts
[Array<Array<number>>, Array<Array<number>>]
```

### `BaseIndependentLinearWeightsTransformation#coefsArrayMatricesSize`

###### Type

```ts
[Size, Size]
```

### `BaseIndependentLinearWeightsTransformation#coefsArrayMatrix`

###### Type

```ts
Array<Array<number>>
```

### `BaseIndependentLinearWeightsTransformation#coefsArrayMatrixSize`

###### Type

```ts
[number, number]
```

### `BaseIndependentLinearWeightsTransformation#getCoefsArrayMatrices()`

###### Parameters

There are no parameters.

###### Returns

`[Array<Array<number>>, Array<Array<number>>]`.

### `BaseIndependentLinearWeightsTransformation#getCoefsArrayMatrix()`

###### Parameters

There are no parameters.

###### Returns

`Array<Array<number>>`.

### `BaseIndependentLinearWeightsTransformation#getSourcePointCoefsArray(sourcePoint)`

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `BaseIndependentLinearWeightsTransformation#getSourcePointCoefsArrays(sourcePoint)`

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`[Array<number>, Array<number>]`.

### `new BaseLinearWeightsTransformation(sourcePoints, destinationPoints, type, pointCountMinimum)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)
* `type` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)
* `pointCountMinimum` (`number`)

###### Returns

`BaseLinearWeightsTransformation`.

###### Extends

* `BaseTransformation`

### `BaseLinearWeightsTransformation#destinationPointsArrays`

###### Type

```ts
[Array<number>, Array<number>]
```

### `BaseLinearWeightsTransformation#getCoefsArrayMatrices()`

###### Parameters

There are no parameters.

###### Returns

`[Array<Array<number>>, Array<Array<number>>]`.

### `BaseLinearWeightsTransformation#getDestinationPointsArrays()`

###### Parameters

There are no parameters.

###### Returns

`[Array<number>, Array<number>]`.

### `BaseLinearWeightsTransformation#getSourcePointCoefsArrays(sourcePoint)`

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`[Array<number>, Array<number>]`.

### `BaseLinearWeightsTransformation#weightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
```

### `new BasePolynomialTransformation(sourcePoints, destinationPoints, order)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)
* `order?` (`number | undefined`)

###### Returns

`BasePolynomialTransformation`.

###### Extends

* `BaseIndependentLinearWeightsTransformation`

### `BasePolynomialTransformation#coefsArrayMatrices`

###### Type

```ts
[Array<Array<number>>, Array<Array<number>>]
```

### `BasePolynomialTransformation#coefsArrayMatricesSize`

###### Type

```ts
[Size, Size]
```

### `BasePolynomialTransformation#coefsArrayMatrix`

###### Type

```ts
Array<Array<number>>
```

### `BasePolynomialTransformation#coefsArrayMatrixSize`

###### Type

```ts
[number, number]
```

### `BasePolynomialTransformation#getCoefsArrayMatrix()`

###### Parameters

There are no parameters.

###### Returns

`Array<Array<number>>`.

### `BasePolynomialTransformation#getDestinationPointsArrays()`

###### Parameters

There are no parameters.

###### Returns

`[Array<number>, Array<number>]`.

### `BasePolynomialTransformation#order`

###### Type

```ts
number
```

### `BasePolynomialTransformation#solve()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `BasePolynomialTransformation#weightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
```

### `new BaseTransformation(sourcePoints, destinationPoints, type, pointCountMinimum)`

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
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)
  * The transformation type
* `pointCountMinimum` (`number`)
  * The minimum number of points for the transformation type

###### Returns

`BaseTransformation`.

### `BaseTransformation#destinationPoints`

###### Type

```ts
Array<Point>
```

### `BaseTransformation#destinationTransformedSourcePoints?`

###### Type

```ts
Array<Point>
```

### `BaseTransformation#errors?`

###### Type

```ts
Array<number>
```

### `BaseTransformation#evaluateFunction(newSourcePoint)`

Evaluate the transformation function at a new point

###### Parameters

* `newSourcePoint` (`[number, number]`)
  * a source point

###### Returns

the source point, transformed to destination space (`[number, number]`).

### `BaseTransformation#evaluatePartialDerivativeX(newSourcePoint)`

Evaluate the transformation function's partial derivative to x at a new point

###### Parameters

* `newSourcePoint` (`[number, number]`)
  * a source point

###### Returns

the x and y component of the partial derivative to x at the source point (`[number, number]`).

### `BaseTransformation#evaluatePartialDerivativeY(newSourcePoint)`

Evaluate the transformation function's partial derivative to y at a new point

###### Parameters

* `newSourcePoint` (`[number, number]`)
  * a source point

###### Returns

the x and y component of the partial derivative to y at the source point (`[number, number]`).

### `BaseTransformation#getDestinationTransformedSourcePoints()`

Get the destination-transformed source points.

###### Parameters

There are no parameters.

###### Returns

source points, transformed to destination domain (`Array<Point>`).

### `BaseTransformation#getErrors()`

###### Parameters

There are no parameters.

###### Returns

`Array<number>`.

### `BaseTransformation#getMeasures()`

###### Parameters

There are no parameters.

###### Returns

`object | HelmertMeasures | Polynomial1Measures`.

### `BaseTransformation#getRmse()`

###### Parameters

There are no parameters.

###### Returns

`number`.

### `BaseTransformation#pointCount`

###### Type

```ts
number
```

### `BaseTransformation#pointCountMinimum`

###### Type

```ts
number
```

### `BaseTransformation#processWeightsArrays()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `BaseTransformation#rmse?`

###### Type

```ts
number
```

### `BaseTransformation#setWeightsArrays(weightsArrays)`

Set weights.

The weights might be obtained in other ways then through solving
(e.g. through solving multiple transformation together when staping).
This function can be used to set weights computed elsewhere.

###### Parameters

* `weightsArrays` (`object`)

###### Returns

`void`.

### `BaseTransformation#solve()`

Note: since (writing to and) reading from matrices is expensive,
we convert to and convert from ml-matrix Matrix types in this function,
in order not to use them in the evaluate functions.

###### Parameters

There are no parameters.

###### Returns

`void`.

### `BaseTransformation#sourcePoints`

###### Type

```ts
Array<Point>
```

### `BaseTransformation#type`

###### Type

```ts
  | 'straight'
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'thinPlateSpline'
  | 'projective'
  | 'linear'
```

### `BaseTransformation#weightsArrays?`

###### Type

```ts
object
```

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

### `GcpTransformOptions`

###### Type

```ts
{
  maxDepth: number
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  geoIsGeographic: boolean
  distortionMeasures: DistortionMeasure[]
  referenceScale: number
  postToGeo: ProjectionFunction
  preToResource: ProjectionFunction
} & MultiGeometryOptions
```

### `new GcpTransformer(gcps, type, partialGcpTransformerOptions)`

Create a GcpTransformer

###### Parameters

* `gcps` (`Array<Gcp>`)
  * An array of Ground Control Points (GCPs)
* `type` (`TransformationType | undefined`)
  * The transformation type
* `partialGcpTransformerOptions?` (`Partial<GcpTransformerOptions> | undefined`)
  * GCP Transformer options

###### Returns

`GcpTransformer`.

###### Extends

* `BaseGcpTransformer`

### `GcpTransformer#gcps`

###### Type

```ts
Array<Gcp>
```

### `GcpTransformer#getToGeoTransformation()`

Get the forward transformation. Create if it doesn't exist yet.

###### Parameters

There are no parameters.

###### Returns

`BaseTransformation`.

### `GcpTransformer#getToGeoTransformationResolution(resourceBbox, partialGcpTransformOptions)`

Get the resolution of the toGeo transformation in resource space, within a given bbox.

This informs you in how fine the warping is, in resource space.
It can be useful e.g. to create a triangulation in resource space
that is fine enough for this warping.

It is obtained by transforming toGeo two linestring,
namely the horizontal and vertical midlines of the given bbox.
The toGeo transformation will refine these lines:
it will break them in small enough pieces to obtain a near continuous result.
Returned in the length of the shortest piece, measured in resource coordinates.

###### Parameters

* `resourceBbox` (`[number, number, number, number]`)
  * BBox in resource space where the resolution is requested
* `partialGcpTransformOptions?` (`Partial<GcpTransformOptions> | undefined`)
  * GCP Transform options to consider during the transformation

###### Returns

Resolution of the toGeo transformation in resource space (`number | undefined`).

### `GcpTransformer#getToResourceTransformation()`

Get the backward transformation. Create if it doesn't exist yet.

###### Parameters

There are no parameters.

###### Returns

`BaseTransformation`.

### `GcpTransformer#getToResourceTransformationResolution(geoBbox, partialGcpTransformOptions)`

Get the resolution of the toResource transformation in geo space, within a given bbox.

This informs you in how fine the warping is, in geo space.
It can be useful e.g. to create a triangulation in geo space
that is fine enough for this warping.

It is obtained by transforming toResource two linestring,
namely the horizontal and vertical midlines of the given bbox.
The toResource transformation will refine these lines:
it will break them in small enough pieces to obtain a near continuous result.
Returned in the length of the shortest piece, measured in geo coordinates.

###### Parameters

* `geoBbox` (`[number, number, number, number]`)
  * BBox in geo space where the resolution is requested
* `partialGcpTransformOptions` (`{ maxDepth?: number | undefined; minOffsetRatio?: number | undefined; minOffsetDistance?: number | undefined; minLineDistance?: number | undefined; geoIsGeographic?: boolean | undefined; ... 4 more ...; isMultiGeometry?: false | undefined; }`)
  * GCP Transform options to consider during the transformation

###### Returns

Resolution of the toResource transformation in geo space (`number | undefined`).

### `GcpTransformer#getTransformerOptions()`

Get the transformer options.

###### Parameters

There are no parameters.

###### Returns

`{ differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; sourceIsGeographic: boolean; destinationIsGeographic: boolean; ... 5 more ...; postBackward: ProjectionFunction; } & MultiGeometryOptions`.

### `GcpTransformer#setTransformerOptionsInternal(partialGcpTransformerOptions)`

Set the transformer options.

Use with caution, especially for options that have effects in the constructor.

###### Parameters

* `partialGcpTransformerOptions` (`{ differentHandedness?: boolean | undefined; maxDepth?: number | undefined; minOffsetRatio?: number | undefined; minOffsetDistance?: number | undefined; minLineDistance?: number | undefined; ... 5 more ...; isMultiGeometry?: false | undefined; }`)

###### Returns

`void`.

### `GcpTransformer#transformToGeo(point, partialGcpTransformOptions, gcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `partialGcpTransformOptions?` (`Partial<GcpTransformOptions> | undefined`)
* `gcpToP?` (`((gcp: GcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GcpTransformer#transformToResource(point, partialGcpTransformOptions, gcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `partialGcpTransformOptions?` (`Partial<GcpTransformOptions> | undefined`)
* `gcpToP?` (`((gcp: GcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GcpTransformer.fromGeoreferencedMap(georeferencedMap, options)`

Create a Projected GCP Transformer from a Georeferenced Map

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; i...`)
  * A Georeferenced Map
* `options?` (`Partial<{ differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; geoIsGeographic: boolean; distortionMeasures: DistortionMeasure[]; referenceScale: number; postToGeo: ProjectionFunction; preToResource: ProjectionFunction; } & MultiGeometryOpt...`)
  * Options, including GCP Transformer Options, and a transformation type to overrule the type defined in the Georeferenced Map

###### Returns

A Projected GCP Transformer (`GcpTransformer`).

### `GcpTransformer.transformGeojsonFeatureCollectionToSvgString(transformer, geojson, partialGcpTransformOptions)`

Transform a GeoJSON FeatureCollection to resource space to a SVG string

This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
Note: since this converts from GeoJSON we assume geo-space is in lon-lat WGS84 and automatically set `destinationIsGeographic` to use geographically computed midpoints.
Note: Multi-geometries are not supported

###### Parameters

* `transformer` (`GcpTransformer`)
  * A GCP Transformer defining the transformation
* `geojson` (`{type: 'FeatureCollection'; features: GeojsonFeature[]}`)
  * GeoJSON FeatureCollection to transform
* `partialGcpTransformOptions?` (`Partial<GcpTransformOptions> | undefined`)
  * GCP Transform options

###### Returns

Input GeoJSON FeaturesCollection transformed to resource space, as SVG string (`string`).

### `GcpTransformer.transformGeojsonToSvg(transformer, geojsonGeometry, partialGcpTransformOptions)`

Transform a GeoJSON Geometry to resource space to a SVG geometry

This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
Note: since this converts from GeoJSON we assume geo-space is in lon-lat WGS84 and automatically set `destinationIsGeographic` to use geographically computed midpoints.
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
* `partialGcpTransformOptions?` (`Partial<GcpTransformOptions> | undefined`)
  * GCP Transform options

###### Returns

Input GeoJSON Geometry transform to resource space, as SVG geometry (`SvgCircle | SvgLine | SvgPolyLine | SvgRect | SvgPolygon`).

### `GcpTransformer.transformSvgStringToGeojsonFeatureCollection(transformer, svg, partialGcpTransformOptions)`

Transform an SVG string to geo space to a GeoJSON FeatureCollection

This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
Note: since this converts to GeoJSON we assume geo-space is in lon-lat WGS84 and automatically set `destinationIsGeographic` to use geographically computed midpoints.
Note: Multi-geometries are not supported

###### Parameters

* `transformer` (`GcpTransformer`)
  * A GCP Transformer defining the transformation
* `svg` (`string`)
  * An SVG string to transform
* `partialGcpTransformOptions?` (`Partial<GcpTransformOptions> | undefined`)
  * GCP Transform options

###### Returns

Input SVG string transformed to geo space, as a GeoJSON FeatureCollection (`{type: 'FeatureCollection'; features: GeojsonFeature[]}`).

### `GcpTransformer.transformSvgToGeojson(transformer, svgCircle, partialGcpTransformOptions)`

###### Parameters

* `transformer` (`GcpTransformer`)
* `svgCircle` (`{type: 'circle'; attributes?: SvgAttributes; coordinates: Point}`)
* `partialGcpTransformOptions?` (`Partial<GcpTransformOptions> | undefined`)

###### Returns

`{type: 'Point'; coordinates: number[]}`.

### `GcpTransformerInputs`

###### Type

```ts
GcpsInputs & TransformationTypeInputs
```

### `GcpTransformerOptions`

###### Type

```ts
{differentHandedness: boolean} & {
  maxDepth: number
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  geoIsGeographic: boolean
  distortionMeasures: DistortionMeasure[]
  referenceScale: number
  postToGeo: ProjectionFunction
  preToResource: ProjectionFunction
} & MultiGeometryOptions
```

### `GcpsInputs`

###### Fields

* `gcps` (`Array<Gcp>`)

### `GeneralGcp`

###### Fields

* `destination` (`[number, number]`)
* `source` (`[number, number]`)

### `GeneralGcpAndDistortions`

###### Type

```ts
GeneralGcp & Partial<Distortions>
```

### `GeneralGcpTransformOptions`

###### Type

```ts
{ maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; sourceIsGeographic: boolean; destinationIsGeographic: boolean; distortionMeasures: DistortionMeasure[]; ... 4 more ...; postBackward: ProjectionFunction; } & MultiGeometryOptions
```

### `new GeneralGcpTransformer(generalGcps, type, partialGeneralGcpTransformerOptions)`

Create a GeneralGcpTransformer

###### Parameters

* `generalGcps` (`Array<GeneralGcp>`)
  * An array of General Ground Control Points (GCPs)
* `type` (`TransformationType | undefined`)
  * The transformation type
* `partialGeneralGcpTransformerOptions?` (`Partial<GeneralGcpTransformerOptions> | undefined`)
  * General GCP Transformer options

###### Returns

`GeneralGcpTransformer`.

###### Extends

* `BaseGcpTransformer`

### `GeneralGcpTransformer#generalGcps`

###### Type

```ts
Array<GeneralGcp>
```

### `GeneralGcpTransformer#getBackwardTransformation()`

Get the backward transformation. Create if it doesn't exist yet.

###### Parameters

There are no parameters.

###### Returns

`BaseTransformation`.

### `GeneralGcpTransformer#getBackwardTransformationResolution(destinationBbox, partialGeneralGcpTransformOptions)`

Get the resolution of the backward transformation in destination space, within a given bbox.

This informs you in how fine the warping is, in destination space.
It can be useful e.g. to create a triangulation in destination space
that is fine enough for this warping.

It is obtained by transforming backward two linestring,
namely the horizontal and vertical midlines of the given bbox.
The backward transformation will refine these lines:
it will break them in small enough pieces to obtain a near continuous result.
Returned in the length of the shortest piece, measured in destination coordinates.

###### Parameters

* `destinationBbox` (`[number, number, number, number]`)
  * BBox in destination space where the resolution is requested
* `partialGeneralGcpTransformOptions` (`{ maxDepth?: number | undefined; minOffsetRatio?: number | undefined; minOffsetDistance?: number | undefined; minLineDistance?: number | undefined; sourceIsGeographic?: boolean | undefined; ... 7 more ...; isMultiGeometry?: false | undefined; }`)
  * General GCP Transform options to consider during the transformation

###### Returns

Resolution of the backward transformation in destination space (`number | undefined`).

### `GeneralGcpTransformer#getForwardTransformation()`

Get the forward transformation. Create if it doesn't exist yet.

###### Parameters

There are no parameters.

###### Returns

`BaseTransformation`.

### `GeneralGcpTransformer#getForwardTransformationResolution(sourceBbox, partialGeneralGcpTransformOptions)`

Get the resolution of the forward transformation in source space, within a given bbox.

This informs you in how fine the warping is, in source space.
It can be useful e.g. to create a triangulation in source space
that is fine enough for this warping.

It is obtained by transforming forward two linestring,
namely the horizontal and vertical midlines of the given bbox.
The forward transformation will refine these lines:
it will break them in small enough pieces to obtain a near continuous result.
Returned in the length of the shortest piece, measured in source coordinates.

###### Parameters

* `sourceBbox` (`[number, number, number, number]`)
  * BBox in source space where the resolution is requested
* `partialGeneralGcpTransformOptions` (`{ maxDepth?: number | undefined; minOffsetRatio?: number | undefined; minOffsetDistance?: number | undefined; minLineDistance?: number | undefined; sourceIsGeographic?: boolean | undefined; ... 7 more ...; isMultiGeometry?: false | undefined; }`)
  * General GCP Transform options to consider during the transformation

###### Returns

Resolution of the forward transformation in source space (`number | undefined`).

### `GeneralGcpTransformer#transformBackward(point, partialGeneralGcpTransformOptions, generalGcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `partialGeneralGcpTransformOptions?` (`Partial<GeneralGcpTransformOptions> | undefined`)
* `generalGcpToP?` (`((generalGcp: GeneralGcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GeneralGcpTransformer#transformForward(point, partialGeneralGcpTransformOptions, generalGcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `partialGeneralGcpTransformOptions?` (`Partial<GeneralGcpTransformOptions> | undefined`)
* `generalGcpToP?` (`((generalGcp: GeneralGcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `GeneralGcpTransformerOptions`

###### Type

```ts
{ differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; sourceIsGeographic: boolean; destinationIsGeographic: boolean; ... 5 more ...; postBackward: ProjectionFunction; } & MultiGeometryOptions
```

### `new Helmert(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Helmert`.

###### Extends

* `BaseLinearWeightsTransformation`

### `Helmert#coefsArrayMatrices`

###### Type

```ts
[Array<Array<number>>, Array<Array<number>>]
```

### `Helmert#coefsArrayMatricesSize`

###### Type

```ts
[Size, Size]
```

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

### `Helmert#getCoefsArrayMatrices()`

###### Parameters

There are no parameters.

###### Returns

`[Array<Array<number>>, Array<Array<number>>]`.

### `Helmert#getDestinationPointsArrays()`

###### Parameters

There are no parameters.

###### Returns

`[Array<number>, Array<number>]`.

### `Helmert#getMeasures()`

###### Parameters

There are no parameters.

###### Returns

`{translation: Point; rotation: number; scale: number}`.

### `Helmert#getSourcePointCoefsArrays(sourcePoint)`

Get two 1x4 coefsArrays, populating the 2Nx4 coefsArrayMatrices
1 0 x0 -y0
1 0 x1 -y1
...
0 1 y0 x0
0 1 y1 x1
...

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`[Array<number>, Array<number>]`.

### `Helmert#solve()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `Helmert#weightsArray?`

###### Type

```ts
Array<number>
```

### `Helmert#weightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
```

### `InverseOptions`

###### Fields

* `inverse` (`boolean`)

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

### `new Polynomial1(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Polynomial1`.

###### Extends

* `BasePolynomialTransformation`

### `Polynomial1#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial1#evaluatePartialDerivativeX(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial1#evaluatePartialDerivativeY(_newSourcePoint)`

###### Parameters

* `_newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial1#getHomogeneousTransform()`

###### Parameters

There are no parameters.

###### Returns

`HomogeneousTransform | undefined`.

### `Polynomial1#getMeasures()`

###### Parameters

There are no parameters.

###### Returns

`{translation: Point; rotation: number; scales: Point; shears: Point}`.

### `Polynomial1#getSourcePointCoefsArray(sourcePoint)`

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `Polynomial1#setWeightsArraysFromHomogeneousTransform(homogeneousTransform)`

###### Parameters

* `homogeneousTransform` (`[number, number, number, number, number, number]`)

###### Returns

`void`.

### `Polynomial1.getPolynomial1SourcePointCoefsArray(sourcePoint)`

Get 1x3 coefsArray, populating the Nx3 coefsArrayMatrix
1 x0 y0
1 x1 y1
1 x2 y2
...

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `new Polynomial2(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Polynomial2`.

###### Extends

* `BasePolynomialTransformation`

### `Polynomial2#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial2#evaluatePartialDerivativeX(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial2#evaluatePartialDerivativeY(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial2#getSourcePointCoefsArray(sourcePoint)`

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `Polynomial2.getPolynomial2SourcePointCoefsArray(sourcePoint)`

Get 1x3 coefsArray, populating the Nx3 coefsArrayMatrix
1 x0 y0 x0^2 y0^2 x0\*y0
...

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `new Polynomial3(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Polynomial3`.

###### Extends

* `BasePolynomialTransformation`

### `Polynomial3#evaluateFunction(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial3#evaluatePartialDerivativeX(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial3#evaluatePartialDerivativeY(newSourcePoint)`

###### Parameters

* `newSourcePoint` (`[number, number]`)

###### Returns

`[number, number]`.

### `Polynomial3#getSourcePointCoefsArray(sourcePoint)`

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `Polynomial3.getPolynomial3SourcePointCoefsArray(sourcePoint)`

Get 1x3 coefsArray, populating the Nx3 coefsArrayMatrix
1 x0 y0 x0^2 y0^2 x0*y0 x0^3 y0^3 x0^2*y0 x0\*y0^2
...

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `ProjectionFunction`

###### Type

```ts
(point: Point) => Point
```

### `new Projective(sourcePoints, destinationPoints)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)

###### Returns

`Projective`.

###### Extends

* `BaseTransformation`

### `Projective#coefsArrayMatrices`

###### Type

```ts
[Array<Array<number>>, Array<Array<number>>]
```

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

### `Projective#solve()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `Projective#weightsArrays?`

###### Type

```ts
Array<Array<number>>
```

### `new RBF(sourcePoints, destinationPoints, kernelFunction, normFunction, type, epsilon)`

###### Parameters

* `sourcePoints` (`Array<Point>`)
* `destinationPoints` (`Array<Point>`)
* `kernelFunction` (`(r: number, options: KernelFunctionOptions) => number`)
* `normFunction` (`(point0: Point, point1: Point) => number`)
* `type` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)
* `epsilon?` (`number | undefined`)

###### Returns

`RBF`.

###### Extends

* `BaseIndependentLinearWeightsTransformation`

### `RBF#affineWeightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
```

### `RBF#coefsArrayMatrices`

###### Type

```ts
[Array<Array<number>>, Array<Array<number>>]
```

### `RBF#coefsArrayMatricesSize`

###### Type

```ts
[Size, Size]
```

### `RBF#coefsArrayMatrix`

###### Type

```ts
Array<Array<number>>
```

### `RBF#coefsArrayMatrixSize`

###### Type

```ts
[number, number]
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

### `RBF#getCoefsArrayMatrix()`

###### Parameters

There are no parameters.

###### Returns

`Array<Array<number>>`.

### `RBF#getDestinationPointsArrays()`

###### Parameters

There are no parameters.

###### Returns

`[Array<number>, Array<number>]`.

### `RBF#getRbfKernelSourcePointCoefsArray(sourcePoint)`

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

### `RBF#getSourcePointCoefsArray(sourcePoint)`

Get 1x(N+3) coefsArray, populating the (N+3)x(N+3) coefsArrayMatrix

The coefsArray has a 1xN kernel part and a 1x3 affine part.

###### Parameters

* `sourcePoint` (`[number, number]`)

###### Returns

`Array<number>`.

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

### `RBF#processWeightsArrays()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `RBF#rbfWeightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
```

### `RBF#setWeightsArrays(weightsArrays, epsilon)`

###### Parameters

* `weightsArrays` (`object`)
* `epsilon?` (`number | undefined`)

###### Returns

`void`.

### `RBF#solve()`

Solve the x and y components independently.

This uses the exact inverse to compute (for each component, using the same coefs for both)
the exact solution for the system of linear equations
which is (in general) invertable to an exact solution.

This wil result in a weights array for each component with rbf weights and affine weights.

###### Parameters

There are no parameters.

###### Returns

`void`.

### `RBF#weightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
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

* `BaseTransformation`

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

### `Straight#solve()`

Solve the x and y components jointly.

This computes the corresponding Helmert transform and get the scale from it.

###### Parameters

There are no parameters.

###### Returns

`void`.

### `Straight#weightsArrays?`

###### Type

```ts
{
  scale: number
  sourcePointsCenter: Point
  destinationPointsCenter: Point
  translation: Point
}
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
  | 'thinPlateSpline'
  | 'projective'
  | 'linear'
```

### `TransformationTypeInputs`

###### Fields

* `transformationType` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)

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

### `defaultGeneralGcpTransformOptions`

###### Fields

* `destinationIsGeographic` (`false`)
* `distortionMeasures` (`Array<never>`)
* `isMultiGeometry` (`false`)
* `maxDepth` (`number`)
* `minLineDistance` (`number`)
* `minOffsetDistance` (`number`)
* `minOffsetRatio` (`number`)
* `postBackward` (`(point: Point) => Point`)
* `postForward` (`(point: Point) => Point`)
* `preBackward` (`(point: Point) => Point`)
* `preForward` (`(point: Point) => Point`)
* `referenceScale` (`number`)
* `sourceIsGeographic` (`false`)

### `defaultGeneralGcpTransformerOptions`

###### Fields

* `differentHandedness` (`false`)

### `solveIndependentlyInverse(coefsArrayMatrix, destinationPointsArrays)`

Solve the x and y components independently using exact inverse.

This uses the exact inverse to compute (for each component, using the same coefs for both)
the exact solution for the system of linear equations
which is (in general) invertable to an exact solution.

This wil result in a weights array for each component with rbf weights and affine weights.

###### Parameters

* `coefsArrayMatrix` (`Array<Array<number>>`)
* `destinationPointsArrays` (`[Array<number>, Array<number>]`)

###### Returns

`[Array<number>, Array<number>]`.

### `solveIndependentlyPseudoInverse(coefsArrayMatrix, destinationPointsArrays)`

Solve the x and y components independently using PseudoInverse.

This uses the 'Pseudo Inverse' to compute (for each component, using the same coefs for both)
a 'best fit' (least squares) approximate solution for the system of linear equations
which is (in general) over-defined and hence lacks an exact solution.

See <https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse>

This wil result in a weights array for each component:
For order = 1: this.weight = \[\[a0\_x, ax\_x, ay\_x], \[a0\_y, ax\_y, ay\_y]]
For order = 2: ... (similar, following the same order as in coefsArrayMatrix)
For order = 3: ... (similar, following the same order as in coefsArrayMatrix)

###### Parameters

* `coefsArrayMatrix` (`Array<Array<number>>`)
* `destinationPointsArrays` (`[Array<number>, Array<number>]`)

###### Returns

`[Array<number>, Array<number>]`.

### `solveJointlyPseudoInverse(coefsArrayMatrices, destinationPointsArrays)`

Solve the x and y components jointly using PseudoInverse.

This uses the 'Pseudo Inverse' to compute a 'best fit' (least squares) approximate solution
for the system of linear equations, which is (in general) over-defined and hence lacks an exact solution.
See <https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse>

This will result weightsArray shared by both components: \[t\_x, t\_y, m, n]

###### Parameters

* `coefsArrayMatrices` (`[Array<Array<number>>, Array<Array<number>>]`)
* `destinationPointsArrays` (`[Array<number>, Array<number>]`)

###### Returns

`Array<number>`.

### `solveJointlySvd(coefsArrayMatrices, pointCount)`

Solve the x and y components jointly using singular value decomposition.

This uses a singular value decomposition to compute the last (i.e. 9th) 'right singular vector',
i.e. the one with the smallest singular value, wich holds the weights for the solution.
Note that for a set of gcps that exactly follow a projective transformations,
the singular value is null and this vector spans the null-space.

This wil result in a weights array for each component with rbf weights and affine weights.

###### Parameters

* `coefsArrayMatrices` (`[Array<Array<number>>, Array<Array<number>>]`)
* `pointCount` (`number`)

###### Returns

`Array<Array<number>>`.

### `supportedDistortionMeasures`

###### Type

```ts
Array<string>
```

### `supportedtransformationTypes`

###### Type

```ts
Array<
  | 'straight'
  | 'helmert'
  | 'polynomial'
  | 'polynomial2'
  | 'polynomial3'
  | 'thinPlateSpline'
  | 'projective'
>
```
