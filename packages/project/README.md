# @allmaps/project

This module extends the classes from [@allmaps/transform](../../packages/transform/) with projection functions. It contains classes and methods to **transform *and project* Points, LineStrings, Polygons** and other spatial features from image 'resource' space to a '*projected* geo' space.

Like for unprojected transformers, the transformation function that accomplish this are still constructed from **a set of Control Points**, who's coordinates are known in both spaces (and who's geo coordinates are given in lon-lat `EPSG:4326` projection), and a specific **type of transformation** algorithm. Additionally, an internal projection and projection can be defined, in order to transform not from 'resource' to 'geo' space, but from 'resource' to 'projected geo' space of the viewport, optionally passing through an 'internal projected geo' space of the map. This is achieved using the same `toGeo()` and `toResource()` methods.

The **projection** defines the 'projected geo' space of the viewport. Since we will render our geometries in the projected space of our viewport, it is logical to make the transformer aware of this space by supplying its projection, so it can bring the results to this space. It defaults to WebMercator `EPSG:3857`, the projection used by default in most webmaps.

The **internal projection** defines the 'internal projected geo' space. This is the space of the known or supposed projection in which the map was made. It is important to build a transformer between the 'resource' space of the image and the 'internal projected geo' space of this known or supposed projection, to make the transformer account *only* for the warping of the image onto its intended projection space, and not for any other warping due to a choice of the viewport projection (which could be different then the map projection). To bring the results from the 'internal projected geo' space of the map to the 'projected geo' space of the viewport, a `postForward()` function is added at the end of the transformer's `toGeo()` method (and a `preBackward()` function before the `toResource()` method). The 'internal projected geo' space  also defaults to WebMercator `EPSG:3857` (due to it's 'conformal' properties that make it a good general guess for a map's projection at large scales). When the internal projection and projection are identical (as is the default) the `postForward()` function is an identity projection with no effect.

The GCPs must be provided in lon-lat `EPSG:4326` projection (since this is the default projection used by GeoJSON and Georeference Annotations) and are projected to the 'projected geo' space before building the GCP Transformer (who will project them to the 'internal projected geo' space).

Within the Allmaps project, this module is used a.o. in [@allmaps/render](../../packages/render/) and [@allmaps/tileserver](../../apps/tileserver/), two places where we transform and project a IIIF image from the 'resource' space of the image to the 'projected geospatial' space of a map projection (in most cases WebMercator), using the Ground Control Points and transformation type defined in the map's Georeference Annotation.

## How it works

This package exports the `ProjectedGcpTransformer` classes, which extends the `GcpTransformer` class from [@allmaps/transform](../../packages/transform/).

Based on the 'projection' and 'internal projection' defined in the options, it sets the `preBackward()` and `preBackward()` functions, projects the GCPs and creates a GCP Transformer with these settings.

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Install with npm:

```sh
npm install @allmaps/project
```

## Usage

### WebMercator `EPSG:3857`

In this example we use a projected transformer to build a Thin Plate Spline transformation using WebMercator `EPSG:3857` as the default internal projection and projection.

```js
import { ProjectedGcpTransformer } from '@allmaps/project'

const gcps6nad = [
  {
    resource: [3655, 2212],
    geo: [-81.0835336, 25.1265831]
  },
  {
    resource: [2325, 3134],
    geo: [-86.8028652, 21.2483344]
  },
  {
    resource: [3972, 325],
    geo: [-79.9001307, 32.7729016]
  },
  {
    resource: [3451, 2876],
    geo: [-82.1070245, 22.3926126]
  },
  {
    resource: [2067, 920],
    geo: [-89.5068459, 30.0452121]
  },
  {
    resource: [622, 941],
    geo: [-94.9855348, 29.7010565]
  }
]

const options = {
  minOffsetRatio: 0.001,
  maxDepth: 1
}

const projectedTransformer = new ProjectedGcpTransformer(gcps6nad, 'thinPlateSpline')

const resourceLineString = [
  [3655, 2212],
  [2325, 3134],
  [3972, 325],
  [3451, 2876],
  [2067, 920],
  [622, 941]
]

const projectedGeoLineString = projectedTransformer.transformForward(
  resourceLineString,
  options
)
// Returns a lineString in WebMercator coordinates
// projectedGeoLineString = [
//    [-9026177.672071297, 2891300.5329870014],
//    [-9373198.174393559, 2654148.626758824],
//    [-9662850.753461177, 2421514.565058184],
//    [-9323574.366573505, 3126157.1118264655],
//    [-8894441.863840025, 3865199.098714333],
//    [-9011249.09650844, 3203250.985397358],
//    [-9140112.157890854, 2558728.807026262],
//    [-9529235.163058229, 3035139.8385587526],
//    [-9963856.508100005, 3509362.762248845],
//    [-10279457.661673792, 3487086.428862622],
//    [-10573741.366662772, 3465181.0312209423]
//  ]
```

### Specific projection

In this example we use a projected transformer to build a Thin Plate Spline transformation using `EPSG:4269` as the internal projection and WebMercator `EPSG:3857` as the projection.

```js
import { ProjectedGcpTransformer } from '@allmaps/project'

const gcps6nad = ... // See above

const options = {
  minOffsetRatio: 0.001,
  maxDepth: 1,
  internalProjection: 'EPSG:4269'
}

const projectedTransformer = new ProjectedGcpTransformer(gcps6nad, 'thinPlateSpline')

const resourceLineString = [
  [3655, 2212],
  [2325, 3134],
  [3972, 325],
  [3451, 2876],
  [2067, 920],
  [622, 941]
]

const projectedGeoLineString = projectedTransformer.transformForward(
  resourceLineString,
  options
)
// Returns a lineString in WebMercator coordinates with other midpoints
// given the other internal projection
// projectedGeoLineString = [
//    [-9026177.67207128, 2891300.5329870014],
//    [-9373198.174393559, 2651935.190468196],
//    [-9662850.75346119, 2421514.5650581755],
//    [-9323574.366573494, 3122803.2380395485],
//    [-8894441.863839984, 3865199.0987143135],
//    [-9011249.096508412, 3199299.664478264],
//    [-9140112.157890843, 2558728.807026257],
//    [-9529235.163058225, 3030702.536815768],
//    [-9963856.508100009, 3509362.762248825],
//    [-10279457.661673812, 3487169.5021216697],
//    [-10573741.36666281, 3465181.031220897]
//  ]
```

## API

### `new ProjectedGcpTransformer(gcps, type, partialProjectedTransformerOptions)`

Create a ProjectedGcpTransformer

###### Parameters

* `gcps` (`Array<Gcp>`)
  * An array of Ground Control Points (GCPs) in lon-lat 'EPSG:4326'
* `type` (`TransformationType | undefined`)
  * The transformation type
* `partialProjectedTransformerOptions?` (`Partial<ProjectedTransformerOptions> | undefined`)
  * Projected Transformer options

###### Returns

`ProjectedGcpTransformer`.

###### Extends

* `GcpTransformer`

### `ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap, partialProjectedTransformerOptions)`

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; i...`)
* `partialProjectedTransformerOptions?` (`Partial<ProjectedTransformerOptions> | undefined`)

###### Returns

`ProjectedGcpTransformer`.
