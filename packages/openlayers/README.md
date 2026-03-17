# @allmaps/openlayers

Allmaps plugin for OpenLayers. Plugin that uses WebGL to show warped IIIF images on an OpenLayers map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/).

Allmaps plugin for [OpenLayers](https://openlayers.org/). This plugin allows displaying georeferenced [IIIF images](https://iiif.io/) on an OpenLayers map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and uses WebGL to transform images from a IIIF image server to overlay them on their correct geographical position. See [allmaps.org](https://allmaps.org) for more information.

[![Example of the Allmaps plugin for OpenLayers](https://raw.githubusercontent.com/allmaps/allmaps/main/packages/openlayers/example.jpg)](https://observablehq.com/@allmaps/openlayers-plugin)

Examples:

* [Observable notebook](https://observablehq.com/@allmaps/openlayers-plugin)
* [Observable notebook](https://observablehq.com/@allmaps/openlayers-plugin)

## How it works

This plugin exports the class `WarpedMapLayer`. You can add one or multiple Georeference Annotations (or AnnotationPages that contain multiple Georeference Annotations) to a WarpedMapLayer and add the WarpedMapLayer to your OpenLayers map. This will render all georeferenced maps defined by the Georeference Annotations.

To understand what happens under the hood for each georeferenced map, see the [@allmaps/render](../render/README.md) package.

This plugin implements a lot of methods from [@allmaps/warpedmaplayer](../warpedmaplayer/README.md), the core package gathering the functionality connecting the Allmaps plugins to the [@allmaps/render](../render/README.md) package.

## Installation

This package works in browsers and in Node.js as an ESM or an UMD module.

Install with pnpm:

```sh
pnpm install @allmaps/openlayers
```

You can optionally build this package locally by running:

```sh
pnpm run build
```

## Usage

Built for OpenLayers 10, but should work with OpenLayers 9, 8, 7 and 6 as well.

### Adding a WarpedMapLayer to a MapLibre Map

Creating a `WarpedMapLayer` and adding a Georeference Annotation to an OpenLayers map looks like this:

```js
import OpenLayersMap from 'ol/Map'
import Tile from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'

import { WarpedMapLayer } from '@allmaps/openlayers'

const map = new OpenLayersMap({
  target: 'map',
  layers: [
    new Tile({
      source: new OSM()
    })
  ]
})

const annotationUrl = 'https://annotations.allmaps.org/maps/a9458d2f895dcdfb'
const warpedMapLayer = new WarpedMapLayer()

map.addLayer(warpedMapLayer)
warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl).then(() => {
  const bbox = warpedMapLayer
    .getBbox({ projection: { definition: 'EPSG:3857' } })
  if (bbox) {
    map.getView().fit(bbox)
  }
})
```

### Ways to load Georeference Annotations

Once the layer has been added to the map, a Georeference Annotation can be added to a `WarpedMapLayer` using the `addGeoreferenceAnnotation` and `addGeoreferenceAnnotationByUrl` functions:

```js
fetch(annotationUrl)
  .then((response) => response.json())
  .then((annotation) => warpedMapLayer.addGeoreferenceAnnotation(annotation))
```

Or:

```js
await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
```

It's also possible to create a WarpedMapList first and pass it to the layer on creation. This has the advantage of being able to compute properties of a WarpedMapList first, e.g. getting the bounds and passing it to the OpenLayers Map.

```js
import OpenLayersMap from 'ol/Map'
import Tile from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'

import { WarpedMapLayer } from '@allmaps/openlayers'
import { WarpedMapList } from '@allmaps/render'
import { WebGL2WarpedMap } from '@allmaps/render/webgl2'

const annotationUrl =
  'https://annotations.allmaps.org/manifests/8f9faeba73d67031'
const annotation = await fetch(annotationUrl).then((response) =>
    response.json()
  )
const warpedMapList = new WarpedMapList<WebGL2WarpedMap>()
await warpedMapList.addGeoreferenceAnnotation(annotation)
const bbox = warpedMapList.getMapsBbox({ projection: { definition: 'EPSG:3857' } })

const map = new OpenLayersMap({
  target: 'map',
  layers: [
    new Tile({
      source: new OSM()
    })
  ],
  view: new View().fit(bbox, {
  padding: [20, 20, 20, 20]
  })
})

const warpedMapLayer = new WarpedMapLayer({ warpedMapList })
map.addLayer(warpedMapLayer)
```

Note that the `...ByUrl()` functions are not available on a WarpedMapList.

### WarpedMapLayer API, Options and Events

See the [@allmaps/warpedmaplayer](../warpedmaplayer/README.md) package for the API documentation of the methods coming from the WarpedMapLayer class (shared by all Allmaps plugins). It describes the methods like `addGeoreferenceAnnotation()` and includes a list of all options that can be set on instances of the class and all events which are passed to the native map instance hosting the layer instance.

You can set **options** on the entire layer, or on a specific map on the layer (overwriting layer options):

```js
warpedMapLayer.setLayerOptions({ visible: true })
warpedMapLayer.setMapOptions(mapId, { visible: true })
```

You can listen to **events** in the typical way:

```js
map.on('warpedmapadded', (event) => {
  console.log(event.mapIds)
})
```

### Viewport projections

Allmaps supports two types of map projections as documented in [@allmaps/project](../project/README.md): *internal projections* and *viewport projections*. OpenLayers [supports](https://openlayers.org/en/latest/examples/scaleline-indiana-east.html) custom view projections, too. The Allmaps OpenLayers plugin can read the projection of the view of an OpenLayers map and apply it.

To set a custom projection to an OpenLayers map and have Allmaps pick it up, use [the `register` function](https://openlayers.org/en/latest/apidoc/module-ol_proj_proj4.html#.register) as foreseen in OpenLayers. (This works because the plugin loads Proj4 as a peer dependency.)

Optionally, also register your custom projections with the warpedMapLayer. This allows using the projection objects (including properties like `id` and `name`) through-out Allmaps. If omitted, the plugin will create new projection object containing only the definition.

```js
import proj4 from 'proj4'

//... other imports

// const map = ...
// const warpedMapLayer = ...

const myProjection = {
  id: 'EPSG:28992',
  name: 'RD new',
  definition:
    '+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.4171,50.3319,465.5524,1.9342,-1.6677,9.1019,4.0725 +units=m +no_defs +type=crs'
}

proj4.defs(myProjection.id, projection.definition)
register(proj4)

// Optional
warpedMapLayer.registerProjections([ myProjection ])
```

Then, create a new view with that projection and set the bbox, computed using the current projection:

```js
const bbox = warpedMapLayer
  .getBbox({ projection: myProjection })
if (bbox) {
  map.setView(
    new View({
      projection: myProjection.id
    })
  )
  map.getView().fit(bbox)
}
```

## License

MIT

## API

### `new OLWarpedMapEvent(type, data)`

###### Parameters

* `type` (`string`)
* `data` (`unknown`)

###### Returns

`OLWarpedMapEvent`.

###### Extends

* `Event`

### `OLWarpedMapEvent#data`

###### Type

```ts
unknown
```

### `OpenLayersWarpedMapLayerOptions`

###### Type

```ts
object & Partial<WebGL2RenderOptions>
```

### `new TriangulatedWarpedMap(mapId, georeferencedMap, listOptions, mapOptions)`

Creates an instance of a TriangulatedWarpedMap.

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `georeferencedMap` (`{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: st...`)
  * Georeferenced map used to construct the WarpedMap
* `listOptions?` (`Partial<WarpedMapListOptions<TriangulatedWarpedMap>> | undefined`)
* `mapOptions?` (`Partial<WarpedMapOptions> | undefined`)

###### Returns

`TriangulatedWarpedMap`.

###### Extends

* `WarpedMap`

### `TriangulatedWarpedMap#clearProjectedTransformerCaches()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `TriangulatedWarpedMap#clearProjectedTriangulationCaches()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `TriangulatedWarpedMap#clearResourceTriangulationCaches()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `TriangulatedWarpedMap#defaultOptions`

###### Type

```ts
SpecificTriangulatedWarpedMapOptions & WarpedMapOptions
```

### `TriangulatedWarpedMap#georeferencedMapOptions`

###### Type

```ts
{ resourceResolution?: number | undefined; distortionMeasures?: Array<DistortionMeasure> | undefined; fetchFn?: FetchFn | undefined; gcps?: Array<Gcp> | undefined; resourceMask?: Ring | undefined; ... 5 more ...; distortionMeasure?: DistortionMeasure | undefined; }
```

### `TriangulatedWarpedMap#listOptions`

###### Type

```ts
{ resourceResolution?: number | undefined; distortionMeasures?: Array<DistortionMeasure> | undefined; fetchFn?: FetchFn | undefined; gcps?: Array<Gcp> | undefined; resourceMask?: Ring | undefined; ... 5 more ...; distortionMeasure?: DistortionMeasure | undefined; }
```

### `TriangulatedWarpedMap#mapOptions`

###### Type

```ts
{ resourceResolution?: number | undefined; distortionMeasures?: Array<DistortionMeasure> | undefined; fetchFn?: FetchFn | undefined; gcps?: Array<Gcp> | undefined; resourceMask?: Ring | undefined; ... 5 more ...; distortionMeasure?: DistortionMeasure | undefined; }
```

### `TriangulatedWarpedMap#mixPreviousAndNew(t)`

Mix previous transform properties with new ones (when changing an ongoing animation).

###### Parameters

* `t` (`number`)
  * animation progress

###### Returns

`void`.

### `TriangulatedWarpedMap#options`

###### Type

```ts
SpecificTriangulatedWarpedMapOptions & WarpedMapOptions
```

### `TriangulatedWarpedMap#previousResourceResolution`

###### Type

```ts
number | undefined
```

### `TriangulatedWarpedMap#previousTrianglePointsDistortion`

###### Type

```ts
Array<number>
```

### `TriangulatedWarpedMap#projectedGcpPreviousTriangulation?`

###### Type

```ts
{
  resourceResolution: number | undefined
  gcpUniquePoints: GcpAndDistortions[]
  uniquePointIndices: number[]
  uniquePointIndexInterpolatedPolygon: TypedPolygon<number>
}
```

### `TriangulatedWarpedMap#projectedGcpTriangulation?`

###### Type

```ts
{
  resourceResolution: number | undefined
  gcpUniquePoints: GcpAndDistortions[]
  uniquePointIndices: number[]
  uniquePointIndexInterpolatedPolygon: TypedPolygon<number>
}
```

### `TriangulatedWarpedMap#projectedGcpTriangulationCache`

###### Type

```ts
Map<
  number,
  Map<
    string,
    Map<TransformationType, Map<string, Map<string, GcpTriangulation>>>
  >
>
```

### `TriangulatedWarpedMap#projectedGeoPreviousTrianglePoints`

###### Type

```ts
Array<Point>
```

### `TriangulatedWarpedMap#projectedGeoPreviousTriangulationAppliableMask`

###### Type

```ts
Array<Point>
```

### `TriangulatedWarpedMap#projectedGeoPreviousTriangulationMask`

###### Type

```ts
Array<Point>
```

### `TriangulatedWarpedMap#projectedGeoTrianglePoints`

###### Type

```ts
Array<Point>
```

### `TriangulatedWarpedMap#projectedGeoTriangulationAppliableMask`

###### Type

```ts
Array<Point>
```

### `TriangulatedWarpedMap#projectedGeoTriangulationMask`

###### Type

```ts
Array<Point>
```

### `TriangulatedWarpedMap#resetPrevious()`

Reset previous transform properties to new ones (when completing an animation).

###### Parameters

There are no parameters.

###### Returns

`void`.

### `TriangulatedWarpedMap#resourceResolution`

###### Type

```ts
number | undefined
```

### `TriangulatedWarpedMap#resourceTrianglePoints`

###### Type

```ts
Array<Point>
```

### `TriangulatedWarpedMap#resourceTriangulationCache`

###### Type

```ts
Map<number, Map<string, TriangulationToUnique>>
```

### `TriangulatedWarpedMap#setDefaultOptions()`

Set the defaultOptions

###### Parameters

There are no parameters.

###### Returns

`void`.

### `TriangulatedWarpedMap#setDistortionMeasure(distortionMeasure)`

Set the distortionMeasure

###### Parameters

* `distortionMeasure?` (`DistortionMeasure | undefined`)
  * the disortion measure

###### Returns

`void`.

### `TriangulatedWarpedMap#setGcps(gcps)`

Update the ground control points loaded from a georeferenced map to new ground control points.

###### Parameters

* `gcps` (`Array<Gcp>`)
  * the new ground control points

###### Returns

`void`.

### `TriangulatedWarpedMap#setInternalProjection(projection)`

Set the internal projection

###### Parameters

* `projection` (`{id?: string; name?: string; definition: ProjectionDefinition}`)
  * the internal projection

###### Returns

`void`.

### `TriangulatedWarpedMap#setListOptions(listOptions, animationOptions)`

Set the list options

###### Parameters

* `listOptions?` (`Partial<TriangulatedWarpedMapOptions> | undefined`)
  * list options
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`object`.

### `TriangulatedWarpedMap#setMapOptions(mapOptions, listOptions, animationOptions)`

Set the map-specific options (and the list options)

###### Parameters

* `mapOptions?` (`Partial<TriangulatedWarpedMapOptions> | undefined`)
  * Map-specific options
* `listOptions?` (`Partial<TriangulatedWarpedMapOptions> | undefined`)
  * list options
* `animationOptions?` (`Partial<AnimationOptions & AnimationOptionsInternal> | undefined`)
  * Animation options

###### Returns

`object`.

### `TriangulatedWarpedMap#setProjection(projection)`

Set the projection

###### Parameters

* `projection` (`{id?: string; name?: string; definition: ProjectionDefinition}`)
  * the projection

###### Returns

`void`.

### `TriangulatedWarpedMap#setResourceMask(resourceFullMask, resourceAppliableMask, resourceMask)`

Update the resource mask loaded from a georeferenced map to a new mask.

###### Parameters

* `resourceFullMask` (`Array<Point>`)
* `resourceAppliableMask` (`Array<Point>`)
* `resourceMask` (`Array<Point>`)
  * the new mask

###### Returns

`void`.

### `TriangulatedWarpedMap#trianglePointsDistortion`

###### Type

```ts
Array<number>
```

### `TriangulatedWarpedMap#triangulateErrorCount`

###### Type

```ts
number
```

### `TriangulatedWarpedMap#updateProjectedTransformerProperties()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `TriangulatedWarpedMap#updateTrianglePoints`

Derive the (previous and new) resource and projectedGeo points from their corresponding triangulations (`any`).

Also derive the (previous and new) triangulation-refined resource and projectedGeo mask

### `TriangulatedWarpedMap#updateTrianglePointsDistortion`

Derive the (previous and new) distortions from their corresponding triangulations (`any`).

### `TriangulatedWarpedMap#updateTriangulation`

Update the (previous and new) triangulation of the resourceMask (`any`). Use cache if available.

### `TriangulatedWarpedMap.getDefaultOptions()`

Get default options

###### Parameters

There are no parameters.

###### Returns

`SpecificTriangulatedWarpedMapOptions & WarpedMapOptions`.

### `new WarpedMap(mapId, georeferencedMap, listOptions, mapOptions)`

Creates an instance of WarpedMap.

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `georeferencedMap` (`{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: st...`)
  * Georeferenced map used to construct the WarpedMap
* `listOptions?` (`Partial<WarpedMapListOptions<WarpedMap>> | undefined`)
* `mapOptions?` (`Partial<WarpedMapOptions> | undefined`)

###### Returns

`WarpedMap`.

###### Extends

* `EventTarget`

### `WarpedMap#abortController?`

###### Type

```ts
AbortController
```

### `WarpedMap#applyOptions(animationOptions)`

###### Parameters

* `animationOptions?` (`Partial<AnimationOptions & AnimationOptionsInternal> | undefined`)

###### Returns

`object`.

### `WarpedMap#clearProjectedTransformerCaches()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMap#defaultOptions`

###### Type

```ts
{
  fetchFn?: FetchFn
  gcps: Gcp[]
  resourceMask: Ring
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
  visible: boolean
  applyMask: boolean
  distortionMeasure: DistortionMeasure | undefined
}
```

### `WarpedMap#destroy()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMap#distortionMeasure?`

###### Type

```ts
'log2sigma' | 'twoOmega' | 'airyKavr' | 'signDetJ' | 'thetaa'
```

### `WarpedMap#fetchableTilesForViewport`

###### Type

```ts
Array<FetchableTile>
```

### `WarpedMap#fetchingImageInfo`

###### Type

```ts
boolean
```

### `WarpedMap#gcps`

###### Type

```ts
Array<Gcp>
```

### `WarpedMap#geoAppliableMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#geoAppliableMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#geoAppliableMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#geoFullMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#geoFullMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#geoFullMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#geoMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#geoMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#geoMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#geoPoints`

###### Type

```ts
Array<Point>
```

### `WarpedMap#georeferencedMap`

###### Type

```ts
{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: st...
```

### `WarpedMap#georeferencedMapOptions`

###### Type

```ts
{ fetchFn?: FetchFn | undefined; gcps?: Array<Gcp> | undefined; resourceMask?: Ring | undefined; transformationType?: TransformationType | undefined; ... 4 more ...; distortionMeasure?: DistortionMeasure | undefined; }
```

### `WarpedMap#getDefaultAndGeoreferencedMapOptions()`

Get default and georeferenced map options

###### Parameters

There are no parameters.

###### Returns

`{
  fetchFn?: FetchFn
  gcps: Gcp[]
  resourceMask: Ring
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
  visible: boolean
  applyMask: boolean
  distortionMeasure: DistortionMeasure | undefined
}`.

### `WarpedMap#getProjectedTransformer(transformationType, partialProjectedGcpTransformerOptions)`

Get a projected transformer of the given transformation type.

Uses cashed projected transformers by transformation type,
and only computes a new projected transformer if none found.

Returns a projected transformer in the current projection,
even if the cached transformer was computed in a different projection.

Default settings apply for the options.

###### Parameters

* `transformationType` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)
* `partialProjectedGcpTransformerOptions?` (`Partial<ProjectedGcpTransformerOptions> | undefined`)

###### Returns

A projected transformer (`ProjectedGcpTransformer`).

### `WarpedMap#getReferenceScale()`

Get the reference scaling from the forward transformation of the projected Helmert transformer

###### Parameters

There are no parameters.

###### Returns

`number`.

### `WarpedMap#getResourceFullMask`

###### Type

```ts
any
```

### `WarpedMap#getResourceToCanvasScale(viewport)`

Get scale of the warped map, in resource pixels per canvas pixels.

###### Parameters

* `viewport` (`Viewport`)
  * the current viewport

###### Returns

`number`.

### `WarpedMap#getResourceToViewportScale(viewport)`

Get scale of the warped map, in resource pixels per viewport pixels.

###### Parameters

* `viewport` (`Viewport`)
  * the current viewport

###### Returns

`number`.

### `WarpedMap#hasImage()`

Check if this instance has parsed image

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WarpedMap#image?`

###### Type

```ts
Image
```

### `WarpedMap#internalProjection`

###### Type

```ts
{id?: string; name?: string; definition: ProjectionDefinition}
```

### `WarpedMap#listOptions`

###### Type

```ts
{ createRTree?: boolean | undefined; rtreeUpdatedOptions?: Array<string> | undefined; animatedOptions?: Array<string> | undefined; warpedMapFactory?: WarpedMapFactory<WarpedMap> | undefined; ... 61 more ...; distortionMeasure?: DistortionMeasure | undefined; }
```

### `WarpedMap#loadImage(imagesById)`

Load the parsed image from cache, or fetch and parse the image info to create it

###### Parameters

* `imagesById?` (`Map<string, Image> | undefined`)

###### Returns

`Promise<void>`.

### `WarpedMap#mapId`

###### Type

```ts
string
```

### `WarpedMap#mapOptions`

###### Type

```ts
{ fetchFn?: FetchFn | undefined; gcps?: Array<Gcp> | undefined; resourceMask?: Ring | undefined; transformationType?: TransformationType | undefined; ... 4 more ...; distortionMeasure?: DistortionMeasure | undefined; }
```

### `WarpedMap#mixPreviousAndNew(t)`

Mix previous transform properties with new ones (when changing an ongoing animation).

###### Parameters

* `t` (`number`)
  * animation progress

###### Returns

`void`.

### `WarpedMap#mixed`

###### Type

```ts
boolean
```

### `WarpedMap#options`

###### Type

```ts
{
  fetchFn?: FetchFn
  gcps: Gcp[]
  resourceMask: Ring
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
  visible: boolean
  applyMask: boolean
  distortionMeasure: DistortionMeasure | undefined
}
```

### `WarpedMap#overviewFetchableTilesForViewport`

###### Type

```ts
Array<FetchableTile>
```

### `WarpedMap#overviewTileZoomLevelForViewport?`

###### Type

```ts
{
  scaleFactor: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  columns: number
  rows: number
}
```

### `WarpedMap#previousDistortionMeasure?`

###### Type

```ts
'log2sigma' | 'twoOmega' | 'airyKavr' | 'signDetJ' | 'thetaa'
```

### `WarpedMap#previousInternalProjection`

###### Type

```ts
{id?: string; name?: string; definition: ProjectionDefinition}
```

### `WarpedMap#previousTransformationType`

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

### `WarpedMap#projectedGcps`

###### Type

```ts
Array<Gcp>
```

### `WarpedMap#projectedGeoAppliableMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#projectedGeoAppliableMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#projectedGeoAppliableMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#projectedGeoBufferedViewportRectangleBboxForViewport?`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#projectedGeoBufferedViewportRectangleForViewport?`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#projectedGeoFullMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#projectedGeoFullMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#projectedGeoFullMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#projectedGeoMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#projectedGeoMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#projectedGeoMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#projectedGeoPoints`

###### Type

```ts
Array<Point>
```

### `WarpedMap#projectedGeoPreviousTransformedResourcePoints`

###### Type

```ts
Array<Point>
```

### `WarpedMap#projectedGeoTransformedResourcePoints`

###### Type

```ts
Array<Point>
```

### `WarpedMap#projectedPreviousTransformer`

###### Type

```ts
ProjectedGcpTransformer
```

### `WarpedMap#projectedTransformer`

###### Type

```ts
ProjectedGcpTransformer
```

### `WarpedMap#projectedTransformerCache`

###### Type

```ts
Map<TransformationType, ProjectedGcpTransformer>
```

### `WarpedMap#projectedTransformerDoubleCache`

###### Type

```ts
Map<TransformationType, Map<string, ProjectedGcpTransformer>>
```

### `WarpedMap#projection`

###### Type

```ts
{id?: string; name?: string; definition: ProjectionDefinition}
```

### `WarpedMap#resetForViewport()`

Reset the properties for the current values

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMap#resetPrevious()`

Reset previous transform properties to new ones (when completing an animation).

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMap#resourceAppliableMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#resourceAppliableMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#resourceAppliableMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#resourceBufferedViewportRingBboxAndResourceMaskBboxIntersectionForViewport?`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#resourceBufferedViewportRingBboxForViewport?`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#resourceBufferedViewportRingForViewport?`

###### Type

```ts
Array<Point>
```

### `WarpedMap#resourceFullMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#resourceFullMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#resourceFullMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#resourceMask`

###### Type

```ts
Array<Point>
```

### `WarpedMap#resourceMaskBbox`

###### Type

```ts
[number, number, number, number]
```

### `WarpedMap#resourceMaskRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `WarpedMap#resourcePoints`

###### Type

```ts
Array<Point>
```

### `WarpedMap#resourceToProjectedGeoScale`

###### Type

```ts
number
```

### `WarpedMap#setDefaultOptions()`

Set the defaultOptions

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMap#setDistortionMeasure(distortionMeasure)`

Set the distortionMeasure

###### Parameters

* `distortionMeasure?` (`DistortionMeasure | undefined`)
  * the disortion measure

###### Returns

`void`.

### `WarpedMap#setFetchableTilesForViewport(fetchableTiles)`

Set tiles for the current viewport

###### Parameters

* `fetchableTiles` (`Array<FetchableTile>`)

###### Returns

`void`.

### `WarpedMap#setGcps(gcps)`

Update the ground control points loaded from a georeferenced map to new ground control points.

###### Parameters

* `gcps` (`Array<Gcp>`)

###### Returns

`void`.

### `WarpedMap#setInternalProjection(projection)`

Set the internal projection

###### Parameters

* `projection?` (`Projection | undefined`)
  * the internal projection

###### Returns

`void`.

### `WarpedMap#setListOptions(listOptions, animationOptions)`

Set the list options

###### Parameters

* `listOptions?` (`Partial<WarpedMapOptions> | undefined`)
  * list options
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`object`.

### `WarpedMap#setMapOptions(mapOptions, listOptions, animationOptions)`

Set the map-specific options (and the list options)

###### Parameters

* `mapOptions?` (`Partial<WarpedMapOptions> | undefined`)
  * Map-specific options
* `listOptions?` (`Partial<WarpedMapOptions> | undefined`)
  * list options
* `animationOptions?` (`Partial<AnimationOptions & AnimationOptionsInternal> | undefined`)
  * Animation options

###### Returns

`object`.

### `WarpedMap#setOverviewFetchableTilesForViewport(overviewFetchableTiles)`

Set overview tiles for the current viewport

###### Parameters

* `overviewFetchableTiles` (`Array<FetchableTile>`)

###### Returns

`void`.

### `WarpedMap#setOverviewTileZoomLevelForViewport(tileZoomLevel)`

Set the overview tile zoom level for the current viewport

###### Parameters

* `tileZoomLevel?` (`TileZoomLevel | undefined`)
  * tile zoom level for the current viewport

###### Returns

`void`.

### `WarpedMap#setProjectedGeoBufferedViewportRectangleForViewport(projectedGeoBufferedViewportRectangle)`

Set projectedGeoBufferedViewportRectangle for the current viewport

###### Parameters

* `projectedGeoBufferedViewportRectangle?` (`Rectangle | undefined`)

###### Returns

`void`.

### `WarpedMap#setProjection(projection)`

Set the projection

###### Parameters

* `projection?` (`Projection | undefined`)
  * the projection

###### Returns

`void`.

### `WarpedMap#setResourceBufferedViewportRingBboxAndResourceMaskBboxIntersectionForViewport(resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection)`

Set resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection for the current viewport

###### Parameters

* `resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection?` (`Bbox | undefined`)

###### Returns

`void`.

### `WarpedMap#setResourceBufferedViewportRingForViewport(resourceBufferedViewportRing)`

Set resourceBufferedViewportRing for the current viewport

###### Parameters

* `resourceBufferedViewportRing?` (`Ring | undefined`)

###### Returns

`void`.

### `WarpedMap#setResourceMask(resourceFullMask, resourceAppliableMask, resourceMask)`

Update the resource mask loaded from a georeferenced map to a new mask.

###### Parameters

* `resourceFullMask` (`Array<Point>`)
* `resourceAppliableMask` (`Array<Point>`)
* `resourceMask` (`Array<Point>`)

###### Returns

`void`.

### `WarpedMap#setTileZoomLevelForViewport(tileZoomLevel)`

Set the tile zoom level for the current viewport

###### Parameters

* `tileZoomLevel?` (`TileZoomLevel | undefined`)
  * tile zoom level for the current viewport

###### Returns

`void`.

### `WarpedMap#setTransformationType(transformationType)`

Set the transformationType

###### Parameters

* `transformationType` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)

###### Returns

`void`.

### `WarpedMap#shouldRenderLines()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WarpedMap#shouldRenderMap()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WarpedMap#shouldRenderPoints()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WarpedMap#tileSize?`

###### Type

```ts
[number, number]
```

### `WarpedMap#tileZoomLevelForViewport?`

###### Type

```ts
{
  scaleFactor: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  columns: number
  rows: number
}
```

### `WarpedMap#transformationType`

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

### `WarpedMap#updateAppliableGeoMask`

###### Type

```ts
any
```

### `WarpedMap#updateFullGeoMask`

###### Type

```ts
any
```

### `WarpedMap#updateGcpsProperties`

###### Type

```ts
any
```

### `WarpedMap#updateGeoMask`

###### Type

```ts
any
```

### `WarpedMap#updateGeoMaskProperties`

###### Type

```ts
any
```

### `WarpedMap#updateProjectedAppliableGeoMask`

###### Type

```ts
any
```

### `WarpedMap#updateProjectedFullGeoMask`

###### Type

```ts
any
```

### `WarpedMap#updateProjectedGeoMask`

###### Type

```ts
any
```

### `WarpedMap#updateProjectedGeoMaskProperties`

###### Type

```ts
any
```

### `WarpedMap#updateProjectedTransformer`

###### Type

```ts
any
```

### `WarpedMap#updateProjectedTransformerProperties()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMap#updateResourceMaskProperties`

###### Type

```ts
any
```

### `WarpedMap#updateResourceToProjectedGeoScale`

###### Type

```ts
any
```

### `WarpedMap.getDefaultOptions()`

Get default options

###### Parameters

There are no parameters.

###### Returns

`{
  fetchFn?: FetchFn
  gcps: Gcp[]
  resourceMask: Ring
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
  visible: boolean
  applyMask: boolean
  distortionMeasure: DistortionMeasure | undefined
}`.

### `new WarpedMapEvent(type, data)`

###### Parameters

* `type` (`WarpedMapEventType`)
* `data?` (`Partial<WarpedMapEventData> | undefined`)

###### Returns

`WarpedMapEvent`.

###### Extends

* `Event`

### `WarpedMapEvent#data?`

###### Type

```ts
{
  mapIds?: Array<string> | undefined
  tileUrl?: string | undefined
  optionKeys?: Array<string> | undefined
  animationOptions?: Partial<AnimationOptions> | undefined
  spritesInfo?: SpritesInfo | undefined
}
```

### `new WarpedMapLayer(options)`

Creates a WarpedMapLayer instance

###### Parameters

* `options?` (`Partial<OpenLayersWarpedMapLayerOptions> | undefined`)
  * the WebGL2 renderer options

###### Returns

`WarpedMapLayer`.

###### Extends

* `Layer`
* `BaseWarpedMapLayer`

### `WarpedMapLayer#addEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#addGeoreferenceAnnotation(annotation, mapOptions)`

Adds a Georeference Annotation

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation
* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map options

###### Returns

Map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferenceAnnotationByUrl(annotationUrl, mapOptions)`

Adds a Georeference Annotation by URL

###### Parameters

* `annotationUrl` (`string`)
  * URL of a Georeference Annotation
* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map options

###### Returns

Map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferencedMap(georeferencedMap, mapOptions)`

Adds a Georeferenced Map

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced Map
* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map options

###### Returns

Map ID of the map that was added, or an error (`Promise<string | Error>`).

### `WarpedMapLayer#addImageInfos(imageInfos)`

Adds image information to the WarpedMapList's image information cache

###### Parameters

* `imageInfos` (`Array<unknown>`)
  * Image informations

###### Returns

Image IDs of the image informations that were added (`Array<string>`).

### `WarpedMapLayer#addSprites(sprites, imageUrl, imageSize)`

Adds sprites to the Renderer's sprite tile cache

This adds tiles from sprites to warped maps in WarpedMapList. Load maps before running this function.
This uses the image info of related maps. When using addImageInfos(), call it before calling this function.

###### Parameters

* `sprites` (`Array<Sprite>`)
  * Sprites
* `imageUrl` (`string`)
  * Image url
* `imageSize` (`[number, number]`)
  * Image size

###### Returns

`Promise<void>`.

### `WarpedMapLayer#bringMapsForward(mapIds)`

Bring maps forward

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#bringMapsToFront(mapIds)`

Bring maps to front

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#canvas`

###### Type

```ts
HTMLCanvasElement
```

### `WarpedMapLayer#canvasSize`

###### Type

```ts
[number, number]
```

### `WarpedMapLayer#clear()`

Removes all warped maps from the layer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#container`

###### Type

```ts
HTMLDivElement
```

### `WarpedMapLayer#contextLost(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#contextRestored(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#defaultSpecificWarpedMapLayerOptions`

###### Type

```ts
object
```

### `WarpedMapLayer#dispose()`

Disposes all WebGL resources and cached tiles

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#getBbox(projectionOptions)`

Get the bounding box of all maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The bbox of all maps, in the chosen projection, or undefined if there were no maps (`Bbox | undefined`).

### `WarpedMapLayer#getCenter(projectionOptions)`

Get the center of the bounding box of all maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The center of the bbox of all maps, in the chosen projection, or undefined if there were no maps (`Point | undefined`).

### `WarpedMapLayer#getConvexHull(projectionOptions)`

Get the convex hull of all maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The convex hull of all maps, in the chosen projection, or undefined if there were no maps (`Ring | undefined`).

### `WarpedMapLayer#getDefaultOptions()`

Get the default options the layer

###### Parameters

There are no parameters.

###### Returns

`object &
  SpecificBaseRenderOptions<WebGL2WarpedMap> &
  Partial<WarpedMapListOptions<WebGL2WarpedMap>> &
  SpecificWebGL2WarpedMapOptions &
  SpecificTriangulatedWarpedMapOptions &
  WarpedMapOptions`.

### `WarpedMapLayer#getExtent()`

Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.

###### Parameters

There are no parameters.

###### Returns

`Extent | undefined`.

* Bounding box of all warped maps

### `WarpedMapLayer#getLayerOptions()`

Get the layer options

###### Parameters

There are no parameters.

###### Returns

`{ warpedMapFactory?: WarpedMapFactory<WebGL2WarpedMap> | undefined; warpedMapList?: WarpedMapList<WebGL2WarpedMap> | undefined; ... 64 more ...; distortionMeasure?: DistortionMeasure | undefined; }`.

### `WarpedMapLayer#getMapDefaultOptions(mapId)`

Get the default options of a map

These come from the default option settings for WebGL2WarpedMaps and the map's georeferenced map proporties

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`WebGL2WarpedMapOptions | undefined`.

### `WarpedMapLayer#getMapIds()`

Get mapIds for selected maps

Note: more selection options are available on this function of WarpedMapList

###### Parameters

There are no parameters.

###### Returns

`Array<string>`.

### `WarpedMapLayer#getMapMapOptions(mapId)`

Get the map-specific options of a map

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`Partial<WebGL2WarpedMapOptions> | undefined`.

### `WarpedMapLayer#getMapOptions(mapId)`

Get the options of a map

These options are the result of merging the default, georeferenced map,
layer and map-specific options of that map.

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`WebGL2WarpedMapOptions | undefined`.

### `WarpedMapLayer#getMapZIndex(mapId)`

Get the z-index of a map

###### Parameters

* `mapId` (`string`)
  * Map ID for which to get the z-index

###### Returns

The z-index of a map (`number | undefined`).

### `WarpedMapLayer#getMapsBbox(mapIds, projectionOptions)`

Get the bounding box of the maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Bbox | undefined`).

### `WarpedMapLayer#getMapsCenter(mapIds, projectionOptions)`

Get the center of the bounding box of the maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Point | undefined`).

### `WarpedMapLayer#getMapsConvexHull(mapIds, projectionOptions)`

Get the convex hull of the maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Ring | undefined`).

### `WarpedMapLayer#getOpacity()`

Get the layer opacity

Returns a number between 0 and 1 (the default)

###### Parameters

There are no parameters.

###### Returns

`number`.

### `WarpedMapLayer#getWarpedMap(mapId)`

Get the WarpedMap instance for a map

###### Parameters

* `mapId` (`string`)
  * Map ID of the requested WarpedMap instance

###### Returns

`WebGL2WarpedMap | undefined`.

### `WarpedMapLayer#getWarpedMapList()`

Get the WarpedMapList object that contains a list of the warped maps of all loaded maps

###### Parameters

There are no parameters.

###### Returns

`WarpedMapList<WebGL2WarpedMap>`.

### `WarpedMapLayer#getWarpedMaps(mapIds)`

Get the WarpedMap instances for selected maps

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds?` (`Array<string> | undefined`)
  * Map IDs

###### Returns

`Iterable<WebGL2WarpedMap>`.

### `WarpedMapLayer#gl`

###### Type

```ts
WebGL2RenderingContext | null | undefined
```

### `WarpedMapLayer#nativePassWarpedMapEvent(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#nativeUpdate()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#options`

###### Type

```ts
object & Partial<WebGL2RenderOptions>
```

### `WarpedMapLayer#removeEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#removeGeoreferenceAnnotation(annotation)`

Removes a Georeference Annotation

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation

###### Returns

Map IDs of the maps that were removed, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#removeGeoreferenceAnnotationByUrl(annotationUrl)`

Removes a Georeference Annotation by URL

###### Parameters

* `annotationUrl` (`string`)
  * URL of a Georeference Annotation

###### Returns

Map IDs of the maps that were removed, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#removeGeoreferencedMap(georeferencedMap)`

Removes a Georeferenced Map

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced Map

###### Returns

Map ID of the map that was removed, or an error (`Promise<string | Error>`).

### `WarpedMapLayer#removeGeoreferencedMapById(mapId)`

Removes a Georeferenced Map by its ID

###### Parameters

* `mapId` (`string`)
  * Map ID of the georeferenced map to remove

###### Returns

Map ID of the map that was removed, or an error (`Promise<string | Error | undefined>`).

### `WarpedMapLayer#render(frameState)`

Render the layer.

###### Parameters

* `frameState` (`{ pixelRatio: number; time: number; viewState: State; animate: boolean; coordinateToPixelTransform: Transform; ... 14 more ...; renderTargets: { [x: string]: boolean; }; }`)
  * OpenLayers frame state

###### Returns

The rendered element (`HTMLElement`).

### `WarpedMapLayer#renderer`

###### Type

```ts
WebGL2Renderer
```

### `WarpedMapLayer#resetLayerOptions(layerOptionKeys, animationOptions)`

Reset the layer options

An empty array resets all options, undefined resets no options.
Doesn't reset render options or specific warped map layer options

###### Parameters

* `layerOptionKeys?` (`Array<string> | undefined`)
  * Keys of the options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#resetMapsOptions(mapIds, mapOptionKeys, layerOptionKeys, animationOptions)`

Reset the map-specific options of maps (and the layer options)

An empty array resets all options, undefined resets no options.
Doesn't reset render options or specific warped map layer options

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs for which to reset the options
* `mapOptionKeys?` (`Array<string> | undefined`)
  * Keys of the map-specific options to reset
* `layerOptionKeys?` (`Array<string> | undefined`)
  * Keys of the layer options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#resetMapsOptionsByMapId(mapOptionkeysByMapId, layerOptionKeys, animationOptions)`

Reset the map-specific options of maps by map ID (and the layer options)

An empty array or map resets all options (for all maps), undefined resets no options.
Doesn't reset render options or specific warped map layer options

###### Parameters

* `mapOptionkeysByMapId` (`Map<string, Array<string>>`)
  * Keys of map-specific options to reset by map ID
* `layerOptionKeys?` (`Array<string> | undefined`)
  * Keys of the layer options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#resizeCanvas(canvas, __1)`

###### Parameters

* `canvas` (`HTMLCanvasElement`)
* `undefined` (`[number, number]`)

###### Returns

`boolean`.

### `WarpedMapLayer#resizeObserver`

###### Type

```ts
ResizeObserver
```

### `WarpedMapLayer#resized(entries)`

###### Parameters

* `entries` (`Array<ResizeObserverEntry>`)

###### Returns

`void`.

### `WarpedMapLayer#sendMapsBackward(mapIds)`

Send maps backward

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#sendMapsToBack(mapIds)`

Send maps to back

###### Parameters

* `mapIds` (`Array<string>`)
  * IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#setLayerOptions(layerOptions, animationOptions)`

Set the layer options

###### Parameters

* `layerOptions` (`object | Partial<WebGL2RenderOptions>`)
  * Layer options to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setLayerOptions({ transformationType: 'thinPlateSpline' })
```

### `WarpedMapLayer#setLayerTransformationType(transformationType, animationOptions)`

Set the transformation type of the layer

###### Parameters

* `transformationType?` (`TransformationType | undefined`)
  * Transformation type to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#setMapGcps(mapId, gcps, animationOptions)`

Set the GCPs of a map

This only sets the map-specific `gcps` option of the map
(or more specifically of the warped map used for rendering),
overwriting the original GCPs inferred from the Georeference Annotation.

The original GCPs can be reset by resetting the map-specific GCPs option,
and stay accessible in the warped map's `map` property.

###### Parameters

* `mapId` (`string`)
  * Map ID for which to set the options
* `gcps` (`Array<Gcp>`)
  * GCPs to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#setMapOptions(mapId, mapOptions, layerOptions, animationOptions)`

Set the map-specific options of a map (and the layer options)

In general setting a map-specific option
also sets the corresponding option of the map,
since these are the result of merging the default, georeferenced map,
layer and map-specific options of that map.

A special case is setting a map-specific option to `undefined`:
then the corresponding option is derived from the default, georeferenced map or layer option.
This is equivalent to using the reset function for map-specific option.

###### Parameters

* `mapId` (`string`)
  * Map ID for which to set the options
* `mapOptions` (`{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsColor?: string | undefined; renderGcpsSize?: number | undefined; renderGcpsBorderColor?: string | undefined; ... 54 more ...; distortionMeasure?: DistortionMeasure | ...`)
  * Map-specific options to set
* `layerOptions?` (`object | Partial<WebGL2RenderOptions> | undefined`)
  * Layer options to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setMapOptions(myMapId, { transformationType: 'thinPlateSpline' })
```

### `WarpedMapLayer#setMapResourceMask(mapId, resourceMask, animationOptions)`

Set the resource mask of a map

This only sets the map-specific `resourceMask` option of the map
(or more specifically of the warped map used for rendering),
overwriting the original resource mask inferred from the Georeference Annotation.

The original resource mask can be reset by resetting the map-specific resource mask option,
and stays accessible in the warped map's `map` property.

###### Parameters

* `mapId` (`string`)
  * Map ID for which to set the options
* `resourceMask` (`Array<Point>`)
  * Resource mask to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#setMapTransformationType(mapId, transformationType, animationOptions)`

Set the transformation type of a map

This only sets the map-specific `transformationType` option of the map
(or more specifically of the warped map used for rendering),
overwriting the original transformation type inferred from the Georeference Annotation.

The original transformation type can be reset by resetting the map-specific transformation type option,
and stays accessible in the warped map's `map` property.

###### Parameters

* `mapId` (`string`)
  * Map ID for which to set the options
* `transformationType?` (`TransformationType | undefined`)
  * Transformation type to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#setMapsOptions(mapIds, mapOptions, layerOptions, animationOptions)`

Set the map-specific options of maps (and the layer options)

In general setting a map-specific option
also sets the corresponding option of the map,
since these are the result of merging the default, georeferenced map,
layer and map-specific options of that map.

A special case is setting a map-specific option to `undefined`:
then the corresponding option is derived from the default, georeferenced map or layer option.
This is equivalent to using the reset function for map-specific option.

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs for which to set the options
* `mapOptions` (`{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsColor?: string | undefined; renderGcpsSize?: number | undefined; renderGcpsBorderColor?: string | undefined; ... 54 more ...; distortionMeasure?: DistortionMeasure | ...`)
  * Map-specific options to set
* `layerOptions?` (`object | Partial<WebGL2RenderOptions> | undefined`)
  * Layer options to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setMapsOptions([myMapId], { transformationType: 'thinPlateSpline' })
```

### `WarpedMapLayer#setMapsOptionsByMapId(mapOptionsByMapId, layerOptions, animationOptions)`

Set the map-specific options of maps by map ID (and the layer options)

In general setting a map-specific option
also sets the corresponding option of the map,
since these are the result of merging the default, georeferenced map,
layer and map-specific options of that map.

A special case is setting a map-specific option to `undefined`:
then the corresponding option is derived from the default, georeferenced map or layer option.
This is equivalent to using the reset function for map-specific option.

###### Parameters

* `mapOptionsByMapId` (`Map<string, Partial<WebGL2WarpedMapOptions>>`)
  * Map-specific options to set by map ID
* `layerOptions?` (`object | Partial<WebGL2RenderOptions> | undefined`)
  * Layer options to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#setMapsTransformationType(mapIds, transformationType, animationOptions)`

Set the transformation type of maps

This only sets the map-specific `transformationType` option of the map
(or more specifically of the warped map used for rendering),
overwriting the original transformation type inferred from the Georeference Annotation.

The original transformation type can be reset by resetting the map-specific transformation type option,
and stays accessible in the warped map's `map` property.

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs for which to set the options
* `transformationType?` (`TransformationType | undefined`)
  * Transformation type to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapLayer#setOpacity(opacity)`

Set the layer opacity

###### Parameters

* `opacity` (`number`)
  * Layer opacity to set

###### Returns

`void`.

### `new WarpedMapList(options)`

Creates an instance of a WarpedMapList

###### Parameters

* `options?` (`Partial<WarpedMapListOptions<W>> | undefined`)
  * Options of this list, which will be set on newly added maps as their list options

###### Returns

`WarpedMapList<W>`.

###### Extends

* `EventTarget`

### `WarpedMapList#DEFAULT_WARPED_MAP_LIST_OPTIONS`

Maps in this list, indexed by their ID

###### Type

```ts
SpecificWarpedMapListOptions<W> & Partial<WebGL2WarpedMapOptions>
```

### `WarpedMapList#addEventListenersToWarpedMap`

###### Type

```ts
any
```

### `WarpedMapList#addGeoreferenceAnnotation(annotation, mapOptions)`

Parses an annotation and adds its georeferenced map to this list

###### Parameters

* `annotation` (`unknown`)
  * Annotation
* `mapOptions?` (`Partial<GetWarpedMapOptions<W>> | undefined`)
  * Map options

###### Returns

Map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapList#addGeoreferencedMap(georeferencedMap, mapOptions)`

Adds a georeferenced map to this list

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced Map
* `mapOptions?` (`Partial<GetWarpedMapOptions<W>> | undefined`)
  * Map options

###### Returns

Map ID of the map that was added (`Promise<string>`).

### `WarpedMapList#addGeoreferencedMapInternal`

###### Type

```ts
any
```

### `WarpedMapList#addImageInfos(imageInfos)`

Adds image informations, parses them to images and adds them to the image cache

###### Parameters

* `imageInfos` (`Array<unknown>`)
  * Image informations

###### Returns

Image IDs of the image informations that were added (`Array<string>`).

### `WarpedMapList#addToOrUpdateRtree`

###### Type

```ts
any
```

### `WarpedMapList#bringMapsForward(mapIds)`

Changes the z-index of the specified maps to bring them forward

###### Parameters

* `mapIds` (`Iterable<string>`)
  * Map IDs

###### Returns

`void`.

### `WarpedMapList#bringMapsToFront(mapIds)`

Changes the z-index of the specified maps to bring them to front

###### Parameters

* `mapIds` (`Iterable<string>`)
  * Map IDs

###### Returns

`void`.

### `WarpedMapList#clear()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapList#destroy()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapList#getDefaultOptions()`

Get the default options of the list

###### Parameters

There are no parameters.

###### Returns

`SpecificWarpedMapListOptions<W> &
  Partial<WebGL2WarpedMapOptions> &
  GetWarpedMapOptions<W>`.

### `WarpedMapList#getMapDefaultOptions(mapId)`

Get the default options of a map

These come from the default option settings for WebGL2WarpedMaps and the map's georeferenced map proporties

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`GetWarpedMapOptions<W> | undefined`.

### `WarpedMapList#getMapIds(partialSelectionOptions)`

Get mapIds for selected maps

The selectionOptions allow a.o. to:

* filter for visible maps
* filter for specific mapIds
* filter for maps whose geoBbox overlap with the specified geoBbox
* filter for maps that overlap with a given geoPoint

###### Parameters

* `partialSelectionOptions?` (`Partial<SelectionOptions> | undefined`)
  * Selection options (e.g. mapIds), defaults to all visible maps

###### Returns

mapIds (`Array<string>`).

### `WarpedMapList#getMapMapOptions(mapId)`

Get the map-specific options of a map

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`Partial<GetWarpedMapOptions<W>> | undefined`.

### `WarpedMapList#getMapOptions(mapId)`

Get the options of a map

These options are the result of merging the default, georeferenced map,
layer and map-specific options of that map.

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`GetWarpedMapOptions<W> | undefined`.

### `WarpedMapList#getMapZIndex(mapId)`

Get the z-index of a map

###### Parameters

* `mapId` (`string`)
  * Map ID for which to get the z-index

###### Returns

`number | undefined`.

### `WarpedMapList#getMapsBbox(partialSelectionAndProjectionOptions)`

Get the bounding box of the maps in this list

The result is returned in lon-lat `EPSG:4326` by default.

###### Parameters

* `partialSelectionAndProjectionOptions?` (`Partial<SelectionOptions & ProjectionOptions> | undefined`)
  * Selection (e.g. mapIds) and projection options, defaults to all visible maps and current projection

###### Returns

The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Bbox | undefined`).

### `WarpedMapList#getMapsCenter(partialSelectionAndProjectionOptions)`

Get the center of the bounding box of the maps in this list

The result is returned in lon-lat `EPSG:4326` by default.

###### Parameters

* `partialSelectionAndProjectionOptions?` (`Partial<SelectionOptions & ProjectionOptions> | undefined`)
  * Selection (e.g. mapIds) and projection options, defaults to all visible maps and current projection

###### Returns

The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Point | undefined`).

### `WarpedMapList#getMapsConvexHull(partialSelectionAndProjectionOptions)`

Get the convex hull of the maps in this list

The result is returned in lon-lat `EPSG:4326` by default.

###### Parameters

* `partialSelectionAndProjectionOptions?` (`Partial<SelectionOptions & ProjectionOptions> | undefined`)
  * Selection (e.g. mapIds) and projection options, defaults to all visible maps and current projection

###### Returns

The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Ring | undefined`).

### `WarpedMapList#getOptions()`

Get the options of this list

###### Parameters

There are no parameters.

###### Returns

`{ createRTree?: boolean | undefined; rtreeUpdatedOptions?: Array<string> | undefined; animatedOptions?: Array<string> | undefined; warpedMapFactory?: WarpedMapFactory<W> | undefined; ... 61 more ...; distortionMeasure?: DistortionMeasure | undefined; }`.

### `WarpedMapList#getOrComputeMapId`

###### Type

```ts
any
```

### `WarpedMapList#getProjectedGeoMaskPoints`

###### Type

```ts
any
```

### `WarpedMapList#getWarpedMap(mapId)`

Get the WarpedMap instance for a map

###### Parameters

* `mapId` (`string`)
  * Map ID of the requested WarpedMap instance

###### Returns

WarpedMap instance, or undefined (`W | undefined`).

### `WarpedMapList#getWarpedMaps(partialSelectionOptions)`

Get the WarpedMap instances for selected maps

The selectionOptions allow a.o. to:

* filter for visible maps
* filter for specific mapIds
* filter for maps whose geoBbox overlap with the specified geoBbox
* filter for maps that overlap with a given geoPoint

###### Parameters

* `partialSelectionOptions?` (`Partial<SelectionOptions> | undefined`)
  * Selection options (e.g. mapIds), defaults to all visible maps

###### Returns

WarpedMap instances (`Iterable<W>`).

### `WarpedMapList#imageLoaded`

###### Type

```ts
any
```

### `WarpedMapList#imagesById`

###### Type

```ts
Map<string, Image>
```

### `WarpedMapList#internalSetMapsOptionsByMapId`

Internal set map options (`any`).

### `WarpedMapList#options`

###### Type

```ts
SpecificWarpedMapListOptions<W> & Partial<WebGL2WarpedMapOptions>
```

### `WarpedMapList#orderMapIdsByZIndex(mapId0, mapId1)`

Order mapIds

Use this as anonymous sort function in Array.prototype.sort()

###### Parameters

* `mapId0` (`string`)
* `mapId1` (`string`)

###### Returns

`number`.

### `WarpedMapList#removeEventListenersFromWarpedMap`

###### Type

```ts
any
```

### `WarpedMapList#removeFromRtree`

###### Type

```ts
any
```

### `WarpedMapList#removeGeoreferenceAnnotation(annotation)`

Parses an annotation and removes its georeferenced map from this list

###### Parameters

* `annotation` (`unknown`)

###### Returns

Map IDs of the maps that were removed, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapList#removeGeoreferencedMap(georeferencedMap)`

Removes a georeferenced map from this list

###### Parameters

* `georeferencedMap` (`unknown`)

###### Returns

Map ID of the removed map, or an error (`Promise<string | Error>`).

### `WarpedMapList#removeGeoreferencedMapById(mapId)`

Removes a georeferenced map from the list by its ID

###### Parameters

* `mapId` (`string`)
  * Map ID

###### Returns

Map ID of the removed map, or an error (`Promise<string | Error | undefined>`).

### `WarpedMapList#removeGeoreferencedMapByIdInternal`

###### Type

```ts
any
```

### `WarpedMapList#removeGeoreferencedMapInternal`

###### Type

```ts
any
```

### `WarpedMapList#removeZIndexHoles`

###### Type

```ts
any
```

### `WarpedMapList#resetMapsOptions(mapIds, mapOptionKeys, listOptionKeys, animationOptions)`

Resets the map-specific options of maps (and the list options)

An empty array resets all options, undefined resets no options.

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs for which to reset the options
* `mapOptionKeys?` (`Array<string> | undefined`)
  * Keys of the map-specific options to reset
* `listOptionKeys?` (`Array<string> | undefined`)
  * Keys of the list options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapList#resetMapsOptionsByMapId(mapOptionkeysByMapId, listOptionKeys, animationOptions)`

Resets the map-specific options of maps by map ID (and the list options)

An empty array or map resets all options (for all maps), undefined resets no options.

###### Parameters

* `mapOptionkeysByMapId?` (`Map<string, Array<string>> | undefined`)
  * Keys of map-specific options to reset by map ID
* `listOptionKeys?` (`Array<string> | undefined`)
  * Keys of the list options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapList#resetOptions(listOptionKeys, animationOptions)`

Resets the list options

An empty array resets all options, undefined resets no options.

###### Parameters

* `listOptionKeys?` (`Array<string> | undefined`)
  * Keys of the list options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapList#rtree?`

###### Type

```ts
RTree
```

### `WarpedMapList#sendMapsBackward(mapIds)`

Changes the zIndex of the specified maps to send them backward

###### Parameters

* `mapIds` (`Iterable<string>`)
  * Map IDs

###### Returns

`void`.

### `WarpedMapList#sendMapsToBack(mapIds)`

Changes the z-index of the specified maps to send them to back

###### Parameters

* `mapIds` (`Iterable<string>`)
  * Map IDs

###### Returns

`void`.

### `WarpedMapList#setMapsOptions(mapIds, mapOptions, listOptions, animationOptions)`

Set the map-specific options of maps (and the list options)

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs for which the options apply
* `mapOptions?` (`Partial<WarpedMapListOptions<W>> | undefined`)
  * Map-specific options
* `listOptions?` (`Partial<WarpedMapListOptions<W>> | undefined`)
  * list options
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapList#setMapsOptionsByMapId(mapOptionsByMapId, listOptions, animationOptions)`

Set the map-specific options of maps by map ID (and the list options)

This is useful when when multiple (and possibly different)
map-specific options are changed at once,
but only one animation should be fired

###### Parameters

* `mapOptionsByMapId?` (`Map<string, Partial<WarpedMapListOptions<W>>> | undefined`)
  * Map-specific options by map ID
* `listOptions?` (`Partial<WarpedMapListOptions<W>> | undefined`)
  * List options
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapList#setOptions(options, animationOptions)`

Set the options of this list

Note: Map-specific options set here will be passed to newly added maps.

###### Parameters

* `options?` (`Partial<WarpedMapListOptions<W>> | undefined`)
  * List Options
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `WarpedMapList#setWarpedMapFactory(warpedMapFactory)`

Set the warpedMapFactory option

This updates the maps in this list using a factory.

This function is used when creating a WarpedMapList from scratch
and later including it in a specific renderer (e.g. a WebGL2Renderer)
which has a specific warpedMapFactory (e.g. including the WebGL context)
which could not be applied in the initial WarpedMapList.
This function recreates the WarpedMaps using the factory.

###### Parameters

* `warpedMapFactory` (`(mapId: string, georeferencedMap: GeoreferencedMap2, listOptions?: Partial<WarpedMapListOptions<W>> | undefined, mapOptions?: Partial<...> | undefined) => W`)

###### Returns

this (`this`).

### `WarpedMapList#updateWarpedMapsUsingFactoryInternal`

###### Type

```ts
any
```

### `WarpedMapList#warpedMapsById`

###### Type

```ts
Map<string, W>
```

### `WarpedMapList#zIndices`

###### Type

```ts
Map<string, number>
```

### `new WebGL2WarpedMap(mapId, georeferencedMap, gl, mapProgram, linesProgram, pointsProgram, listOptions, mapOptions)`

Creates an instance of WebGL2WarpedMap.

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `georeferencedMap` (`{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: st...`)
  * Georeferenced map used to construct the WarpedMap
* `gl` (`WebGL2RenderingContext`)
  * WebGL rendering context
* `mapProgram` (`WebGLProgram`)
  * WebGL program for map
* `linesProgram` (`WebGLProgram`)
* `pointsProgram` (`WebGLProgram`)
* `listOptions?` (`Partial<WarpedMapListOptions<WebGL2WarpedMap>> | undefined`)
* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)

###### Returns

`WebGL2WarpedMap`.

###### Extends

* `TriangulatedWarpedMap`

### `WebGL2WarpedMap#addCachedTileAndUpdateTextures(cachedTile)`

Add cached tile to the textures of this map and update textures

###### Parameters

* `cachedTile` (`CachedTile<ImageData>`)

###### Returns

`void`.

### `WebGL2WarpedMap#applyOptions(animationOptions)`

###### Parameters

* `animationOptions?` (`Partial<AnimationOptions> | undefined`)

###### Returns

`object`.

### `WebGL2WarpedMap#cachedTilesByTileKey`

###### Type

```ts
Map<string, CachedTile<ImageData>>
```

### `WebGL2WarpedMap#cachedTilesByTileUrl`

###### Type

```ts
Map<string, CachedTile<ImageData>>
```

### `WebGL2WarpedMap#cachedTilesForTexture`

###### Type

```ts
Array<CachedTile<ImageData>>
```

### `WebGL2WarpedMap#cachedTilesResourceOriginPointsAndSizesTexture`

###### Type

```ts
WebGLTexture | null
```

### `WebGL2WarpedMap#cachedTilesScaleFactorsTexture`

###### Type

```ts
WebGLTexture | null
```

### `WebGL2WarpedMap#cachedTilesTextureArray`

###### Type

```ts
WebGLTexture | null
```

### `WebGL2WarpedMap#cancelThrottledFunctions()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#clearTextures()`

Clear textures for this map

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#defaultOptions`

###### Type

```ts
SpecificWebGL2WarpedMapOptions &
  SpecificTriangulatedWarpedMapOptions &
  WarpedMapOptions
```

### `WebGL2WarpedMap#destroy()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#georeferencedMapOptions`

###### Type

```ts
{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsColor?: string | undefined; renderGcpsSize?: number | undefined; renderGcpsBorderColor?: string | undefined; ... 54 more ...; distortionMeasure?: DistortionMeasure | ...
```

### `WebGL2WarpedMap#getCachedTilesAtOtherScaleFactors`

###### Type

```ts
any
```

### `WebGL2WarpedMap#gl`

###### Type

```ts
WebGL2RenderingContext
```

### `WebGL2WarpedMap#image`

###### Type

```ts
Image
```

### `WebGL2WarpedMap#imageId`

###### Type

```ts
string
```

### `WebGL2WarpedMap#initializeWebGL(mapProgram, linesProgram, pointsProgram)`

###### Parameters

* `mapProgram` (`WebGLProgram`)
* `linesProgram` (`WebGLProgram`)
* `pointsProgram` (`WebGLProgram`)

###### Returns

`void`.

### `WebGL2WarpedMap#invertedRenderHomogeneousTransform`

###### Type

```ts
[number, number, number, number, number, number]
```

### `WebGL2WarpedMap#lineGroups`

###### Type

```ts
Array<LineGroup>
```

### `WebGL2WarpedMap#linesProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2WarpedMap#linesVao`

###### Type

```ts
WebGLVertexArrayObject | null
```

### `WebGL2WarpedMap#listOptions`

###### Type

```ts
{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsColor?: string | undefined; renderGcpsSize?: number | undefined; renderGcpsBorderColor?: string | undefined; ... 54 more ...; distortionMeasure?: DistortionMeasure | ...
```

### `WebGL2WarpedMap#mapOptions`

###### Type

```ts
{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsColor?: string | undefined; renderGcpsSize?: number | undefined; renderGcpsBorderColor?: string | undefined; ... 54 more ...; distortionMeasure?: DistortionMeasure | ...
```

### `WebGL2WarpedMap#mapProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2WarpedMap#mapVao`

###### Type

```ts
WebGLVertexArrayObject | null
```

### `WebGL2WarpedMap#options`

###### Type

```ts
SpecificWebGL2WarpedMapOptions &
  SpecificTriangulatedWarpedMapOptions &
  WarpedMapOptions
```

### `WebGL2WarpedMap#pointGroups`

###### Type

```ts
Array<PointGroup>
```

### `WebGL2WarpedMap#pointsProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2WarpedMap#pointsVao`

###### Type

```ts
WebGLVertexArrayObject | null
```

### `WebGL2WarpedMap#previousCachedTilesForTexture`

###### Type

```ts
Array<CachedTile<ImageData>>
```

### `WebGL2WarpedMap#removeCachedTileAndUpdateTextures(tileUrl)`

Remove cached tile from the textures of this map and update textures

###### Parameters

* `tileUrl` (`string`)

###### Returns

`void`.

### `WebGL2WarpedMap#setDefaultOptions()`

Set the defaultOptions

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#setLineGroups`

###### Type

```ts
any
```

### `WebGL2WarpedMap#setListOptions(listOptions, animationOptions)`

Set the list options

###### Parameters

* `listOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * list options
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`object`.

### `WebGL2WarpedMap#setMapOptions(mapOptions, listOptions, animationOptions)`

Set the map-specific options (and the list options)

###### Parameters

* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map-specific options
* `listOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * list options
* `animationOptions?` (`Partial<AnimationOptions & AnimationOptionsInternal> | undefined`)
  * Animation options

###### Returns

`object`.

### `WebGL2WarpedMap#setPointGroups`

###### Type

```ts
any
```

### `WebGL2WarpedMap#shouldRenderLines()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WebGL2WarpedMap#shouldRenderMap()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WebGL2WarpedMap#shouldRenderPoints()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WebGL2WarpedMap#throttledUpdateTextures`

###### Type

```ts
any
```

### `WebGL2WarpedMap#tileInCachedTiles`

###### Type

```ts
any
```

### `WebGL2WarpedMap#tileSize`

###### Type

```ts
[number, number]
```

### `WebGL2WarpedMap#tileToCachedTile`

###### Type

```ts
any
```

### `WebGL2WarpedMap#updateCachedTilesForTextures`

###### Type

```ts
any
```

### `WebGL2WarpedMap#updateTextures`

###### Type

```ts
any
```

### `WebGL2WarpedMap#updateVertexBuffers(projectedGeoToClipHomogeneousTransform)`

Update the vertex buffers of this warped map

###### Parameters

* `projectedGeoToClipHomogeneousTransform` (`[number, number, number, number, number, number]`)
  * Transform from projected geo coordinates to webgl2 coordinates in the \[-1, 1] range. Equivalent to OpenLayers' projectionTransform.

###### Returns

`void`.

### `WebGL2WarpedMap#updateVertexBuffersLines`

###### Type

```ts
any
```

### `WebGL2WarpedMap#updateVertexBuffersMap`

###### Type

```ts
any
```

### `WebGL2WarpedMap#updateVertexBuffersPoints`

###### Type

```ts
any
```

### `WebGL2WarpedMap.getDefaultOptions()`

Get default options

###### Parameters

There are no parameters.

###### Returns

`SpecificWebGL2WarpedMapOptions &
  SpecificTriangulatedWarpedMapOptions &
  WarpedMapOptions`.
