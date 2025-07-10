# @allmaps/project

This module extends the GCP Transformer class from [@allmaps/transform](../../packages/transform/) with projection functions: the Projected GCP Transformer class and its methods can **transform *and project* Points, LineStrings, Polygons** and other spatial features from image 'resource' space to a '*projected* geo' space.

Projections are handled by the [Proj4js](https://github.com/proj4js/proj4js) library. This package this supports any projection (or more generally, coordinate reference system or CRS) supported by Proj4js.

Within the Allmaps project, this module is used a.o. in [@allmaps/render](../../packages/render/) and [@allmaps/tileserver](../../apps/tileserver/), two places where we transform a IIIF image from the 'resource' space of the image to the 'projected geospatial' space of a map projection (in most cases WebMercator), using the Ground Control Points and transformation type defined in the map's Georeference Annotation.

## How it works

This package exports the `ProjectedGcpTransformer` class, which extends the `GcpTransformer` class from [@allmaps/transform](../../packages/transform/).

Like instances of the `GcpTransformer` class, instances of the `ProjectedGcpTransformer` class are constructed from **a set of Control Points**, who's coordinates are known in both spaces (and who's geo coordinates are given in lon-lat `EPSG:4326` projection), and a specific **type of transformation** algorithm. Additionally, an internal projection and projection can be defined, in order to transform not from 'resource' to 'geo' space, but from 'resource' to 'projected geo' space of the viewport, optionally passing through an 'internal projected geo' space of the map. This is achieved using the same `toGeo()` and `toResource()` methods.

The **projection** defines the 'projected geo' space of the viewport. Since we will render our geometries in the projected space of our viewport, it is logical to make the transformer aware of this space by supplying its projection, so it can bring the results to this space. It defaults to WebMercator `EPSG:3857`, the projection used by default in most webmaps.

The **internal projection** defines the 'internal projected geo' space. This is the space of the known or supposed projection in which the map was made. When we know this projection, it is important, e.g. when transforming `toGeo`, to build a `toGeoTransfromation` between the 'resource' space of the image and the 'internal projected geo' space of this known or supposed projection. This way we make the transformation account *only* for the warping of the image onto its intended projection space, and not for any other warping due to the choice of viewport projection (which could be different than the map projection). To bring the results from the 'internal projected geo' space of the map to the 'projected geo' space of the viewport, a projection function from 'internal projected geo' to 'projected geo' space is set as the `postToGeo` option (that is part of the GCP Transform options), and executed at the end of the transformer's `toGeo()` method. Similarly when calling the `toResource()` method a `preToResource()` is executed to go from 'projected geo' space to 'internal projected geo' space, before evaluating the `toResourceTransformation` and arriving in 'resource' space. The 'internal projected geo' space also defaults to WebMercator `EPSG:3857` (due to its 'conformal' properties that make it a good general guess for a map's projection at large scales). When the internal projection and projection are identical (as is the default) the `postToGeo()` function is an identity projection with no effect.

The GCPs must be provided in lon-lat `EPSG:4326` projection (since this is the default projection used by GeoJSON and Georeference Annotations) and are projected to the 'projected geo' space before building the GCP Transformer (who will project them to the 'internal projected geo' space).

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Install with npm:

```sh
npm install @allmaps/project
```

## Usage

### Quickstart

Similar to GCP Transformers, when starting from an **Annotation** or **Georeferenced Map**, the fastest way to build a Projected GCP Transformer is:

```js
import { parseAnnotation } from '@allmaps/annotation'
import { ProjectedGcpTransformer } from '@allmaps/project'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create a georeferencedMap from the annotation
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap = georeferencedMaps[0]

// Build Projected GCP Transformer
const projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap)

// Use it to transform geometries, as below. E.g.:
const projectedGeoPoint = projectedTransformer.transformToGeo(resourcePoint)
```

This is equivalent to constructing a projected transformer from the Annotation's or Georeferenced Map's GCPs, transformation type and projection, as in the examples below.

This projected transformer can then be used to transform geometries between 'resource' space and 'projected geo' space.

When **rendering** maps, another way to quickly obtain a projected transformer is to access it directly from a **Warped Map** in the renderer's Warped Map List:

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

### Using a transformer with the default WebMercator `EPSG:3857` projections

In this example we create a projected transformer with a Thin Plate Spline transformation and the default internal projection and projection: WebMercator `EPSG:3857`.

This projected transformer thus gives WebMercator `EPSG:3857` coordinates when transforming forward.

```js
import { ProjectedGcpTransformer } from '@allmaps/project'

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
  minOffsetRatio: 0.001,
  maxDepth: 1
}

const projectedTransformer = new ProjectedGcpTransformer(gcps6, 'thinPlateSpline', options)

const resourceLineString = [
  [3655, 2212],
  [2325, 3134],
  [3972, 325],
  [3451, 2876],
  [2067, 920],
  [622, 941]
]

const projectedGeoLineString = projectedTransformer.transformToGeo(resourceLineString)
// projectedGeoLineString = [
//   [498246.8195647142, 6789061.316027705],
//   [496595.9732655353, 6787546.801212325],
//   [494783.7898554361, 6785995.114473057],
//   [496391.8586632488, 6790623.562354985],
//   [498497.64212101337, 6795403.988950945],
//   [498135.8154413349, 6791100.393518668],
//   [498076.9264938777, 6786883.571136022],
//   [495239.5461210053, 6790036.9871731205],
//   [492300.2095900435, 6793167.011607833],
//   [489770.9992948517, 6793018.672759057],
//   [487201.94796965295, 6792860.379165613]
// ]
```

Notice how this returns a lineString in WebMercator coordinates.

### Using a transformer with a specific internal projection

In this example we create a projected transformer with a Thin Plate Spline transformation, the internal projection set to 'BD72 / Belgian Lambert 72' `EPSG:31370` and the projection set to the WebMercator `EPSG:3857`.

```js
import { ProjectedGcpTransformer } from '@allmaps/project'

const gcps6 = ... // See above

const epsg31370 =
  '+proj=lcc +lat_0=90 +lon_0=4.36748666666667 +lat_1=51.1666672333333 +lat_2=49.8333339 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.8686,52.2978,-103.7239,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs +type=crs'

const options = {
  minOffsetRatio: 0.001,
  maxDepth: 1,
  internalProjection: epsg31370
}

const projectedTransformer = new ProjectedGcpTransformer(gcps6, 'thinPlateSpline', options)

const resourceLineString = [
  [3655, 2212],
  [2325, 3134],
  [3972, 325],
  [3451, 2876],
  [2067, 920],
  [622, 941]
]

const projectedGeoLineString = projectedTransformer.transformToGeo(resourceLineString)
// const projectedGeoLineString = [
//   [498247.196090505, 6789061.7676701555],
//   [496596.0857961293, 6787546.818863111],
//   [494783.8626652385, 6785995.157771795],
//   [496392.4627162781, 6790624.950878147],
//   [498501.57678734255, 6795410.032138047],
//   [498137.15972611686, 6791102.130838948],
//   [498076.85849569837, 6786883.389086489],
//   [495239.9136289843, 6790037.973029668],
//   [492298.9972965987, 6793169.702451241],
//   [489767.88734149706, 6793019.906716891],
//   [487196.5540720398, 6792859.377809678]
// ]
```

Notice how this return a lineString in WebMercator coordinates with different points than previously, since its transformation used another internal projection before projecting the result to WebMercator.

### Using a transformer with a specific internal projection and projection

Likewise, it's possible to specify both the internal projection and projection.

In this example we create a projected transformer with a Thin Plate Spline transformation from the 'resource' space to the 'internal projected' space in the `EPSG:31370` projection, and bring the results to the (default) 'projected geo' space in the 'Amersfoort / RD' New `EPSG:28992` projection.

```js
import { ProjectedGcpTransformer } from '@allmaps/project'

const gcps6 = ... // See above

const epsg31370 = ... // See above
const epsg28992 = "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.4171,50.3319,465.5524,1.9342,-1.6677,9.1019,4.0725 +units=m +no_defs +type=crs"

const options = {
  minOffsetRatio: 0.001,
  maxDepth: 1,
  internalProjection: epsg31370,
  projection: epsg28992
}

const projectedTransformer = new ProjectedGcpTransformer(gcps6, 'thinPlateSpline', options)

const resourceLineString = [
  [3655, 2212],
  [2325, 3134],
  [3972, 325],
  [3451, 2876],
  [2067, 920],
  [622, 941]
]

const projectedGeoLineString = projectedTransformer.transformToGeo(resourceLineString)
// const projectedGeoLineString = [
//   [92171.96319801327, 439250.7392195241],
//   [91140.1318550074, 438330.2059945731],
//   [90008.06902330121, 437388.3781427277],
//   [91038.64166624477, 440228.31014306704],
//   [92378.19922071013, 443158.54244443506],
//   [92119.83597131, 440508.5490631829],
//   [92049.81893950628, 437909.7404415105],
//   [90322.16486404435, 439875.89373726887],
//   [88531.49536626287, 441828.6782593381],
//   [86967.57638718556, 441757.502798549],
//   [85378.67808803722, 441680.55210508476]
// ]
```

Notice how this returns a lineString in WebMercator coordinates with the same points as previously but projected to EPSG:28992

### Transforming to a different projection

Since `projection` is a *transform* option, it can be set on every transform method call. This allows us to change the requested projection from the one specified during a projected transformer creation to *any* projection. Thus, we don't need to create a projected transformer for every projection of interest: we can reuse a transformer and its toGeo and/or toResource transformations (who's computation can be expensive when there are many GCPs).

We can request the result of a 'toGeo' transform using the projected transformer above as follows:

```js
// Same projectedTransformer as above:
// internalProjection: epsg31370,
// projection: epsg28992

const projectedGeoLineString = projectedTransformer.transformToGeo(
  resourceLineString,
  { projection: { definition: 'EPSG:3857' } }
)
// const projectedGeoLineString = [
//   [ 498247.1996476347, 6789061.760253225 ],
//   [ 496596.08934986574, 6787546.81144527 ],
//   [ 494783.8662153203, 6785995.150353045 ],
//   [ 496392.4662716557, 6790624.943463034 ],
//   [ 498501.58034885704, 6795410.0247265855 ],
//   [ 498137.16328437213, 6791102.123423815 ],
//   [ 498076.8620512022, 6786883.381667706 ],
//   [ 495239.91718228994, 6790037.965614326 ],
//   [ 492299.00084753655, 6793169.695039346 ],
//   [ 489767.8908886019, 6793019.899305481 ],
//   [ 487196.5576152448, 6792859.370398756 ]
// ]
```

Notice how this returns a result very close to the earlier result for projectedTransformer with internalProjection `EPSG:31370` and default projection WebMercator `EPSG:3857`.

To change a projected transformer's projection in the *transformer* options (such that it will always be used by default), use the `setProjection()` method.

Passing a projection in a transform call, as above, has been implemented as passing a `postToGeo` function that projects from the transformer's internal projection to the requested projection.

Note: there is no equivalent option for the internal projection.

## Creating and using a projected transformer

Since the Projected GCP Transformer class extends the GCP Transformer class, a lot of its usage is similar. (See the [@allmaps/transform](../../packages/transform/) package for more information on the items below).

When creating an instance from the Projected GCP Transformer class:

* The **GCPs** are specified using the `Gcp` type and with geo component in lon-lat 'EPSG:4326'.
* The same **transformation types** are supported: `polynomial`, `thinPlateSpline`, ...
* Two **extra options** can be set: `projection` specifies the projected geo space (defaults to WebMercator `EPSG:3857`), and `intenalProjection` specifies the projected using when computing the transformation (also defaults to WebMercator `EPSG:3857`). As with a GCP Transformer, the `differentHandedness` is true by default.

When using its main methods:

* The method `transformToGeo()` transforms input geometries from 'resource' space to 'projected geo' space, as the method `transformToResource()` transforms input geometries from 'projected geo' space to 'resource' space.
* Inputs are following the Allmaps Geometries types. To handle GeoJSON Geometries or SVG Geometries, convert to and from these geometry types using the functions available in [@allmaps/stdlib](../../packages/stdlib/).
* **GCP Transform options** can be specified and manage a.o. how geometries are refined and which distortions are computed. The projection functions are now considered when refining geometries and recursively adding midpoints.
* A **'return type function'** can be used to extract distortion information or modify the results.

For faster transformation between SVG Geometries and GeoJSON Geometries, the same shortcut static methods are available for GcpTransformers: `transformSvgToGeojson()`, `transformSvgStringToGeojsonFeatureCollection()`, `transformGeojsonToSvg()`, `transformGeojsonFeatureCollectionToSvgString()`.

Note: Distortions only describe the warping of the transformation, from 'resource' space to 'internal projected geo' space. (Describing the warping up until 'projected geo' space would require applying the chain rule and having access to the partial derivatives of the projection functions.)

### Projected GCP Transformer options

An extra 'transformer option' is available for Projected GCP Transformers:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `internalProjection`     | The geographic projection used internally in the transformation. | `Projection`             | WebMercator `EPSG:3857`

Since the internal projection defines the internal projected space to and from which the transformations have been computed, transform calls can't specify a different internal projection.

### Projected GCP Transform options

An extra 'transform option' is available for Projected GCP Transformers:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `projection`     | The geographic projection rendered in the viewport. | `Projection`             | WebMercator `EPSG:3857`

As with a GCP Transformer, passing this transform option during the transformer's construction here it the default when using the transform methods.

Like other GCP *Transform* options, this option can be set when constructing a transformer *and* when transform geometries. This can be useful, since it allows us to reusing the toGeo and/or toResource transformations of a transformer (which can be expensive to compute for when there are many GCPs) to transform to a new projection. (See example above.)

## Typing

Projections are defined as follows:

```ts
export type Projection = {
  name?: string
  definition: string | proj4.PROJJSONDefinition
}
```

Projection definitions can be anything compatible with [Proj4js](https://github.com/proj4js/proj4js), e.g.
one of the two default named projections `'EPSG:3857'` `'EPSG:4326'`, a proj4-string `'+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'`, a WKT-string or (since Proj4js version 2.19) a [PROJJSON](https://proj.org/en/stable/specifications/projjson.html) definition.

## Benchmark

Here are some benchmarks on building and using a transformer, as computed on a 2023 MacBook Air M2 with 16 GB RAM.

This benchmark can be run with `pnpm run bench`. For more information, see [`./bench/index.js`](`./bench/index.js`).

To create a projected transformer (with 10 points) and compute its 'toGeo' transformation:

| Type            | Ops/s |
|-----------------|-------|
| helmert         | 31178 |
| polynomial1     | 39583 |
| polynomial2     | 31907 |
| polynomial3     | 20137 |
| thinPlateSpline | 17325 |
| projective      | 20322 |

To use a projected transformer (with 10 points, and its 'toGeo' transformation already computed) and transform a point 'toGeo':

| Type            | Ops/s   |
|-----------------|---------|
| helmert         | 3906562 |
| polynomial1     | 3595760 |
| polynomial2     | 3568346 |
| polynomial3     | 2087742 |
| thinPlateSpline | 1759935 |
| projective      | 3621210 |

## License

MIT

## API

### `InternalProjectionInputs`

###### Fields

* `internalProjection?` (`{name?: string; definition: ProjectionDefinition}`)

### `ProjectedGcpTransformOptions`

###### Type

```ts
{projection: Projection} & {
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

### `new ProjectedGcpTransformer(gcps, type, partialProjectedGcpTransformerOptions)`

Create a ProjectedGcpTransformer

###### Parameters

* `gcps` (`Array<Gcp>`)
  * An array of Ground Control Points (GCPs) in lon-lat 'EPSG:4326'
* `type` (`TransformationType | undefined`)
  * The transformation type
* `partialProjectedGcpTransformerOptions?` (`Partial<ProjectedGcpTransformerOptions> | undefined`)
  * Projected GCP Transformer options

###### Returns

`ProjectedGcpTransformer`.

###### Extends

* `GcpTransformer`

### `ProjectedGcpTransformer#interalProjectedGcps`

###### Type

```ts
Array<Gcp>
```

### `ProjectedGcpTransformer#internalProjection`

###### Type

```ts
{name?: string; definition: ProjectionDefinition}
```

### `ProjectedGcpTransformer#internalProjectionToProjection`

###### Type

```ts
(point: Point) => Point
```

### `ProjectedGcpTransformer#lonLatToProjection`

###### Type

```ts
(point: Point) => Point
```

### `ProjectedGcpTransformer#projectedGcps`

###### Type

```ts
Array<Gcp>
```

### `ProjectedGcpTransformer#projection`

###### Type

```ts
{name?: string; definition: ProjectionDefinition}
```

### `ProjectedGcpTransformer#projectionToInternalProjection`

###### Type

```ts
(point: Point) => Point
```

### `ProjectedGcpTransformer#projectionToLatLon`

###### Type

```ts
(point: Point) => Point
```

### `ProjectedGcpTransformer#setProjection(projection)`

Set the projection.

To transform 'toGeo' or 'toResource' to or from a different projection
than set on a transformer's construction (but using the same internal projection)
it's possible to specify the requested projection in the transform options.

This way we circumvent a possibly expensive recomputation
of the toGeo and/or toResource transformations.

To do this more systematically, it's possible to set
a projected gcp transformer's projection using this method

Combine this with a deep clone of the transformer instance
to keep the original transformer as well.

###### Parameters

* `projection` (`{name?: string; definition: ProjectionDefinition}`)

###### Returns

this (`this`).

### `ProjectedGcpTransformer#transformToGeo(point, partialGcpTransformOptions, gcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `partialGcpTransformOptions?` (`Partial<ProjectedGcpTransformOptions> | undefined`)
* `gcpToP?` (`((gcp: GcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `ProjectedGcpTransformer#transformToResource(point, partialGcpTransformOptions, gcpToP)`

###### Parameters

* `point` (`[number, number]`)
* `partialGcpTransformOptions?` (`Partial<ProjectedGcpTransformOptions> | undefined`)
* `gcpToP?` (`((gcp: GcpAndDistortions) => P) | undefined`)

###### Returns

`P`.

### `ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap, options)`

Create a Projected GCP Transformer from a Georeferenced Map

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; i...`)
  * A Georeferenced Map
* `options?` (`Partial<{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; ... 4 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions & TransformationTypeInputs> | undefined`)
  * Options, including Projected GCP Transformer Options, and a transformation type to overrule the type defined in the Georeferenced Map

###### Returns

A Projected GCP Transformer (`ProjectedGcpTransformer`).

### `ProjectedGcpTransformerInputs`

###### Type

```ts
GcpsInputs & TransformationTypeInputs & InternalProjectionInputs
```

### `ProjectedGcpTransformerOptions`

###### Type

```ts
{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; ... 4 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions
```

### `Projection`

###### Fields

* `definition` (`Definition`)
* `name?` (`string`)

### `ProjectionDefinition`

###### Type

```ts
string | PROJJSONDefinition
```

### `defaultProjectedGcpTransformOptions`

###### Fields

* `projection` (`{name?: string; definition: string}`)

### `defaultProjectedGcpTransformerOptions`

###### Fields

* `internalProjection` (`{name?: string; definition: string}`)
* `projection` (`{name?: string; definition: string}`)

### `isEqualProjection(projection0, projection1)`

###### Parameters

* `projection0` (`Projection | undefined`)
* `projection1` (`Projection | undefined`)

###### Returns

`boolean | undefined`.

### `lonLatProjection`

###### Fields

* `definition` (`string`)
* `name` (`string`)

### `webMercatorProjection`

###### Fields

* `definition` (`string`)
* `name` (`string`)
