# @allmaps/render

Allmaps render module. Renders georeferenced IIIF maps specified by a Georeference Annotation.

The following renderers are implemented:

* `CanvasRenderer`: renders WarpedMaps to a HTML Canvas element with the Canvas 2D API
* `WebGL2Renderer`: renders WarpedMaps to a WebGL 2 context
* `IntArrayRenderer`: renders WarpedMaps to an IntArray

This module is mainly used in the Allmaps pipeline by the following packages:

* [Allmaps plugin for Leaflet](../leaflet/)
* [Allmaps plugin for MapLibre](../maplibre/)
* [Allmaps plugin for OpenLayers](../openlayers/)

It is also used in the [Allmaps Preview](../../apps/preview/) app.

## How it works

The render module accomplishes this task with the following classes:

* Most renderers use the concept of a **`Viewport`**, describing coordinate reach that should be rendered.
* All renderers extend the **`BaseRenderer`** class, which implements the general actions of the (automatically throttled) `render()` calls: checking which maps are inside the current viewport, initially loading their image informations, checking which zoomlevel corresponds to the viewport, getting the IIIF tiles of that zoomlevel that are within the viewport.
  * For the `WebGL2Renderer`, a `WebGL2RenderingContext` contains the rendering context for the drawing surface of an HTML element, and a `WebGLProgram` stores the vertex and fragment shader used for rendering a map, its lines and points.
* A **`WarpedMap`** is made from every Georeference Annotation loaded added to the renderer and hence to its warpedMapList. It contains useful properties like mask, center, size ... in resource, geospatial and projected geospatial coordinates. It contains a copy of the ground control points (GCPs) and resource masks, a projected version of the GCPs, a transformation built using the latter and usable to transform points from IIIF resource coordinates to projected geospatial coordinates.
  * If `WebGL2Renderer` is used, a **`TriangulatedWarpedMap`** is created for every WarpedMap, finely triangulating the map, and a **`WebGL2WarpedMap`** is created, containing the WebGL2 information of the map (buffers etc.).
* A **`WarpedMapList`** contains the list of WarpedMaps to draw and uses an **`RTree`** for geospatial map lookup.
* A **`TileCache`** fetches and stores the image data of cached IIIF tiles.

### From Georeference Annotation to a rendered map

During a `CanvasRenderer` or `IntArrayRenderer` render call, a map undergoes the following steps from Georeference Annotation to the canvas:

* For each viewport pixel, from its viewport coordinates its projectedGeo coordinates is obtained and transformed to its corresponding resource coordinates, i.e. it's location in the IIIF image.
* We find the tile on which this point is located, and express the resource coordinates in local tile coordinates.
* We set the color of this pixel from the colors of the four tile pixels surrounding the tile point, through a bilinear interpolation.

During a `WebGL2Renderer` render call, a map undergoes the following steps from Georeference Annotation to the canvas:

* The resource mask is triangulated: the area within is divided into small triangles.
* The optimal tile zoom level for the current viewport is searched, telling us which IIIF tile [`scaleFactor`](https://iiif.io/api/image/3.0/#54-tiles) to use.
* The Viewport is transformed backwards from projected geospatial coordinates to resource coordinates of the IIIF image. The IIIF tiles covering this viewport on the resource image are fetched and cached in the TileCache.
* The area inside the resource mask is rendered in the viewport, triangle by triangle, using the cached tiles. The location of where to render each triangle is computed using the forward transformation built from the GPCs.

## Installation

This package works in browsers and in Node.js as an ESM module.

Install with pnpm:

```sh
pnpm install @allmaps/render
```

You can optionally build this package locally by running:

```sh
pnpm run build
```

## Usage

For the CanvasRenderer

```js
import { CanvasRenderer } from '@allmaps/render/canvas'

// Create a canvas and set your desired width and height
const canvas = document.getElementById('canvas')
canvas.width = width // Your width
canvas.height = height // Your height

// Create a renderer from your canvas
const renderer = new CanvasRenderer(canvas)

// Fetch and parse an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Add the annotation to the renderer
await renderer.addGeoreferenceAnnotation(annotation)

// Render
await renderer.render()
```

For the WebGL2Renderer

```js
import { WebGL2Renderer } from '@allmaps/render/webgl2'

// Create a canvas and set your desired width and height
const canvas = document.getElementById('canvas')
canvas.width = width // Your width
canvas.height = height // Your height

// Get the webgl context of your canvas
const gl = canvas.getContext('webgl2', { premultipliedAlpha: true })

// Create a renderer from your canvas
const renderer = new WebGL2Renderer(gl)

// Fetch and parse an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Add the annotation to the renderer
await renderer.addGeoreferenceAnnotation(annotation)

// Create your viewport
const viewport = viewport // Your viewport, see below

// Render
renderer.render(viewport)
```

For the IntArrayRenderer

```js
import { IntArrayRenderer } from '@allmaps/render/intarray'

// Create a renderer
// See the IntArrayRenderer constructor for more info
// And the Allmaps Preview application for a concrete example
const renderer =
  new IntArrayRenderer() <
  UintArrRet >
  getImageData, // A function to get the image date from an image
  getImageDataValue, // A function to get the image data value from an image
  getImageDataSize, // A function to get the image data size from an image
  options // IntArrayRenderer options

await renderer.addGeoreferenceAnnotation(annotation)

// Create your viewport
const viewport = viewport // Your viewport, see below

const image = await renderer.render(viewport)
```

### Creating a Viewport

The WebGL2Renderer and IntArrayRenderer take a Viewport as input. Create one through one of the following options:

Directly using the Viewport constructor:

```js
import { Viewport } from '@allmaps/render'

new Viewport(
  viewportSize, // Your viewport size, as [width, height]
  projectedGeoCenter, // Your center, in geo coordinates
  projectedGeoPerViewportScale, // Your geo-per-viewport scale
  rotation, // Your rotation
  devicePixelRatio // Your device pixel ratio, e.g. window.devicePixelRatio or just 1
)
```

Using the static method `Viewport.fromWarpedMapList()` to derive a viewport from your WarpedMapList

```js
const viewport = Viewport.fromWarpedMapList(
  viewportSize, // Your viewport size, as [width, height]
  warpedMapList, // Your WarpedMapList, e.g. renderer.warpedMapList
  devicePixelRatio, // Your device pixel ratio, e.g. window.devicePixelRatio or just 1
  fit, // Your fit, i.e. 'cover' or 'contain'
  zoom // Your zoom, e.g. 1
)
```

Using the static method `Viewport.fromProjectedGeoBbox()` to derive a viewport from a bounding box in projected geospatial coordinates

```js
const viewport = Viewport.fromProjectedGeoBbox(
  viewportSize, // Your viewport size, as [width, height]
  projectedGeoBbox, // Your bbox in projected geospatial coordinates
  devicePixelRatio, // Your device pixel ratio, e.g. window.devicePixelRatio or just 1
  fit // Your fit, i.e. 'cover' or 'contain'
)
```

For usage examples in webmapping libraries, see the source code of the Allmaps plugins for [Leaflet](../leaflet/),
[MapLibre](../maplibre/) and [OpenLayers](../openlayers/).

## Naming conventions

In this package the following naming conventions are used:

* `viewport...` indicates properties described in viewport coordinates
* `canvas...` indicates properties described in canvas coordinates (i.e. viewport but with device pixel ratio taken into account)
* `resource...` indicates properties described in resource coordinates (i.e. IIIF tile coordinates of zoomlevel 1)
* `geo...` indicates properties described in geospatial coordinates ('WGS84', i.e. `[lon, lat]`)
* `projectedGeo...` indicates properties described in projected geospatial coordinates (following a CRS, by default 'EPSG:3857' WebMercator)
* `tile...` indicates properties described IIIF tile coordinates

## API

### `new Viewport(viewportSize, projectedGeoCenter, projectedGeoPerViewportScale, rotation, devicePixelRatio)`

Creates a new Viewport

###### Parameters

* `viewportSize` (`[number, number]`)
  * Size of the viewport in viewport pixels, as \[width, height].
* `projectedGeoCenter` (`[number, number]`)
  * Center point of the viewport, in projected coordinates.
* `projectedGeoPerViewportScale` (`number`)
  * Scale of the viewport, in projection coordinates per viewport pixel.
* `rotation` (`number`)
  * Rotation of the viewport with respect to the project coordinate system.
* `devicePixelRatio` (`number | undefined`)
  * The devicePixelRatio of the viewport.

###### Returns

`Viewport`.

### `Viewport#canvasBbox`

###### Type

```ts
[number, number, number, number]
```

### `Viewport#canvasCenter`

###### Type

```ts
[number, number]
```

### `Viewport#canvasRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `Viewport#canvasResolution`

###### Type

```ts
number
```

### `Viewport#canvasSize`

###### Type

```ts
[number, number]
```

### `Viewport#composeProjectedGeoToClipTransform()`

###### Parameters

There are no parameters.

###### Returns

`[number, number, number, number, number, number]`.

### `Viewport#composeProjectedGeoToViewportTransform()`

###### Parameters

There are no parameters.

###### Returns

`[number, number, number, number, number, number]`.

### `Viewport#composeViewportToClipTransform()`

###### Parameters

There are no parameters.

###### Returns

`[number, number, number, number, number, number]`.

### `Viewport#computeProjectedGeoRectangle(projectedGeoCenter, projectedGeoPerViewportScale, rotation, viewportSize)`

Returns a rotated rectangle in projected geo coordinates

###### Parameters

* `projectedGeoCenter` (`[number, number]`)
* `projectedGeoPerViewportScale` (`number`)
* `rotation` (`number`)
* `viewportSize` (`[number, number]`)

###### Returns

`[Point, Point, Point, Point]`.

### `Viewport#devicePixelRatio`

###### Type

```ts
number
```

### `Viewport#geoCenter`

###### Type

```ts
[number, number]
```

### `Viewport#geoRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `Viewport#geoRectangleBbox`

###### Type

```ts
[number, number, number, number]
```

### `Viewport#geoResolution`

###### Type

```ts
number
```

### `Viewport#geoSize`

###### Type

```ts
[number, number]
```

### `Viewport#getProjectedGeoBufferedRectangle(bufferFraction)`

###### Parameters

* `bufferFraction` (`number`)

###### Returns

`[Point, Point, Point, Point]`.

### `Viewport#projectedGeoCenter`

###### Type

```ts
[number, number]
```

### `Viewport#projectedGeoPerCanvasScale`

###### Type

```ts
number
```

### `Viewport#projectedGeoPerViewportScale`

###### Type

```ts
number
```

### `Viewport#projectedGeoRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `Viewport#projectedGeoRectangleBbox`

###### Type

```ts
[number, number, number, number]
```

### `Viewport#projectedGeoResolution`

###### Type

```ts
number
```

### `Viewport#projectedGeoSize`

###### Type

```ts
[number, number]
```

### `Viewport#projectedGeoToClipTransform`

###### Type

```ts
[number, number, number, number, number, number]
```

### `Viewport#projectedGeoToViewportTransform`

###### Type

```ts
[number, number, number, number, number, number]
```

### `Viewport#rotation`

###### Type

```ts
number
```

### `Viewport#viewportBbox`

###### Type

```ts
[number, number, number, number]
```

### `Viewport#viewportCenter`

###### Type

```ts
[number, number]
```

### `Viewport#viewportRectangle`

###### Type

```ts
[Point, Point, Point, Point]
```

### `Viewport#viewportResolution`

###### Type

```ts
number
```

### `Viewport#viewportSize`

###### Type

```ts
[number, number]
```

### `Viewport#viewportToClipTransform`

###### Type

```ts
[number, number, number, number, number, number]
```

### `Viewport.fromProjectedGeoBbox(viewportSize, projectedGeoBbox, devicePixelRatio, fit)`

Static method creates that creates a Viewport from Bbox in projected geospatial coordinates.

###### Parameters

* `viewportSize` (`[number, number]`)
  * Size of the viewport in viewport pixels, as \[width, height].
* `projectedGeoBbox` (`[number, number, number, number]`)
  * A projectedGeoBbox.
* `devicePixelRatio?` (`number | undefined`)
  * The devicePixelRatio of the viewport.
* `fit` (`Fit | undefined`)
  * Whether the viewport should contain or cover the bbox of the warpedMapList.

###### Returns

`Viewport`.

* A new Viewport object

### `Viewport.fromWarpedMapList(viewportSize, warpedMapList, devicePixelRatio, fit, zoom)`

Static method creates that creates a Viewport from a WarpedMapList

###### Parameters

* `viewportSize` (`[number, number]`)
  * Size of the viewport in viewport pixels, as \[width, height].
* `warpedMapList` (`WarpedMapList<W>`)
  * A WarpedMapList.
* `devicePixelRatio?` (`number | undefined`)
  * The devicePixelRatio of the viewport.
* `fit` (`Fit | undefined`)
* `zoom` (`number | undefined`)

###### Returns

`Viewport`.

* A new Viewport object

### `new WarpedMapEvent(type, data)`

###### Parameters

* `type` (`WarpedMapEventType`)
* `data?` (`unknown`)

###### Returns

`WarpedMapEvent`.

###### Extends

* `Event`

### `WarpedMapEvent#data?`

###### Type

```ts
unknown
```

### `WarpedMapLayerOptions`

###### Type

```ts
WarpedMapListOptions &
  WarpedMapOptions & {imageInformations: ImageInformations; fetchFn: FetchFn}
```

### `new WarpedMapList(warpedMapFactory, options)`

Creates an instance of a WarpedMapList.

###### Parameters

* `warpedMapFactory` (`(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) => W`)
  * Factory function for creating WarpedMap objects
* `options?` (`Partial<WarpedMapListOptions> | undefined`)
  * Options

###### Returns

`WarpedMapList<W>`.

###### Extends

* `EventTarget`

### `WarpedMapList#addEventListenersToWarpedMap(warpedMap)`

###### Parameters

* `warpedMap` (`W`)

###### Returns

`void`.

### `WarpedMapList#addGeoreferenceAnnotation(annotation)`

Parses an annotation and adds its georeferenced map to this list

###### Parameters

* `annotation` (`unknown`)

###### Returns

`Promise<Array<string | Error>>`.

### `WarpedMapList#addGeoreferencedMap(georeferencedMap)`

Adds a georeferenced map to this list

###### Parameters

* `georeferencedMap` (`unknown`)

###### Returns

`Promise<string | Error>`.

### `WarpedMapList#addGeoreferencedMapInternal(georeferencedMap)`

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; id: string; ...`)

###### Returns

`Promise<string>`.

### `WarpedMapList#addToOrUpdateRtree(warpedMap)`

###### Parameters

* `warpedMap` (`W`)

###### Returns

`void`.

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

### `WarpedMapList#fetchFn?`

###### Type

```ts
(
  input: Request | string | URL,
  init?: RequestInit
) => Promise<Response>
```

### `WarpedMapList#getBbox()`

Return the bounding box of all visible maps in this list, in geospatial coordinates ('WGS84', i.e. `[lon, lat]`)

###### Parameters

There are no parameters.

###### Returns

`Bbox | undefined`.

### `WarpedMapList#getCenter()`

###### Parameters

There are no parameters.

###### Returns

`Point | undefined`.

### `WarpedMapList#getMapIds()`

Returns mapIds for the maps in this list.

###### Parameters

There are no parameters.

###### Returns

`Iterable<string>`.

### `WarpedMapList#getMapZIndex(mapId)`

Returns the z-index of a map.

###### Parameters

* `mapId` (`string`)

###### Returns

`number | undefined`.

### `WarpedMapList#getMapsByGeoBbox(geoBbox)`

Returns mapIds of the maps whose geoBbox overlaps with the specified geoBbox.

###### Parameters

* `geoBbox` (`[number, number, number, number]`)

###### Returns

`Iterable<string>`.

### `WarpedMapList#getOrComputeMapId(georeferencedMap)`

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; id: string; ...`)

###### Returns

`Promise<string>`.

### `WarpedMapList#getProjectedBbox()`

Return the bounding box of all visible maps in this list, in projected geospatial coordinates

###### Parameters

There are no parameters.

###### Returns

`Bbox | undefined`.

### `WarpedMapList#getProjectedCenter()`

###### Parameters

There are no parameters.

###### Returns

`Point | undefined`.

### `WarpedMapList#getWarpedMap(mapId)`

Returns the WarpedMap object in this list of map specified by its ID.

###### Parameters

* `mapId` (`string`)

###### Returns

`W | undefined`.

### `WarpedMapList#getWarpedMaps()`

Returns WarpedMap objects of the maps in this list.
Optionally specify mapIds whose WarpedMap objects are requested.

###### Parameters

There are no parameters.

###### Returns

`Iterable<W>`.

### `WarpedMapList#hideMaps(mapIds)`

Changes the visibility of the specified maps to `false`

###### Parameters

* `mapIds` (`Iterable<string>`)
  * Map IDs

###### Returns

`void`.

### `WarpedMapList#imageInfoLoaded()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapList#imageInformations?`

###### Type

```ts
Map<string, unknown>
```

### `WarpedMapList#removeEventListenersFromWarpedMap(warpedMap)`

###### Parameters

* `warpedMap` (`W`)

###### Returns

`void`.

### `WarpedMapList#removeFromRtree(warpedMap)`

###### Parameters

* `warpedMap` (`W`)

###### Returns

`void`.

### `WarpedMapList#removeGeoreferenceAnnotation(annotation)`

Parses an annotation and removes its georeferenced map from this list

###### Parameters

* `annotation` (`unknown`)

###### Returns

`Promise<Array<string | Error>>`.

### `WarpedMapList#removeGeoreferencedMap(georeferencedMap)`

Removes a georeferenced map from this list

###### Parameters

* `georeferencedMap` (`unknown`)

###### Returns

`Promise<string | Error>`.

### `WarpedMapList#removeGeoreferencedMapById(mapId)`

Removes a warped map by its ID

###### Parameters

* `mapId` (`string`)
  * the ID of the map

###### Returns

`void`.

### `WarpedMapList#removeGeoreferencedMapInternal(georeferencedMap)`

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; id: string; ...`)

###### Returns

`Promise<string>`.

### `WarpedMapList#removeZIndexHoles()`

###### Parameters

There are no parameters.

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

### `WarpedMapList#setImageInformations(imageInformations)`

Sets the object that caches image information

###### Parameters

* `imageInformations` (`Map<string, unknown>`)
  * object that caches image information

###### Returns

`void`.

### `WarpedMapList#setMapGcps(mapId, gcps)`

Sets the GCPs for a specified map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `gcps` (`Array<Gcp>`)
  * new GCPs

###### Returns

`void`.

### `WarpedMapList#setMapResourceMask(mapId, resourceMask)`

Sets the resource mask for a specified map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `resourceMask` (`Array<Point>`)
  * the new resource mask

###### Returns

`void`.

### `WarpedMapList#setMapTransformationType(mapId, transformationType)`

Sets the transformation type of a single map

###### Parameters

* `mapId` (`string`)
  * the ID of the map
* `transformationType` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'projective'
    | 'thinPlateSpline'`)
  * the new transformation type

###### Returns

`void`.

### `WarpedMapList#setMapsDistortionMeasure(mapIds, distortionMeasure)`

Sets the distortion measure of specified maps

###### Parameters

* `mapIds` (`Iterable<string>`)
  * the IDs of the maps
* `distortionMeasure?` (`DistortionMeasure | undefined`)
  * the distortion measure

###### Returns

`void`.

### `WarpedMapList#setMapsTransformationType(mapIds, transformationType)`

Sets the transformation type of specified maps

###### Parameters

* `mapIds` (`Iterable<string>`)
  * the IDs of the maps
* `transformationType` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'projective'
    | 'thinPlateSpline'`)
  * the new transformation type

###### Returns

`void`.

### `WarpedMapList#showMaps(mapIds)`

Changes the visibility of the specified maps to `true`

###### Parameters

* `mapIds` (`Iterable<string>`)
  * Map IDs

###### Returns

`void`.

### `WarpedMapList#transformation?`

###### Type

```ts
{type: TransformationType; options?: unknown}
```

### `WarpedMapList#warpedMapFactory`

###### Type

```ts
(
  mapId: string,
  georeferencedMap: GeoreferencedMap,
  options?: Partial<WarpedMapOptions>
) => W
```

### `WarpedMapList#warpedMapsById`

Maps in this list, indexed by their ID (`Map<string, W>`).

### `WarpedMapList#zIndices`

###### Type

```ts
Map<string, number>
```

### `createWarpedMapFactory()`

###### Parameters

There are no parameters.

###### Returns

`(
  mapId: string,
  georeferencedMap: GeoreferencedMap,
  options?: Partial<WarpedMapOptions>
) => WarpedMap`.

### `new IntArrayRenderer(getImageData, getImageDataValue, getImageDataSize, options)`

###### Parameters

* `getImageData` (`(data: Uint8ClampedArray) => D`)
* `getImageDataValue` (`(data: D, index: number) => number`)
* `getImageDataSize` (`(data: D) => Size`)
* `options?` (`Partial<RendererOptions> | undefined`)

###### Returns

`IntArrayRenderer<D>`.

###### Extends

* `BaseRenderer`
* `Renderer`

### `IntArrayRenderer#getImageDataSize`

###### Type

```ts
(data: D) => Size
```

### `IntArrayRenderer#getImageDataValue`

###### Type

```ts
(data: D, index: number) => number
```

### `IntArrayRenderer#render(viewport)`

###### Parameters

* `viewport` (`Viewport`)

###### Returns

`Promise<Uint8ClampedArray<ArrayBufferLike>>`.

### `new CanvasRenderer(canvas, options)`

###### Parameters

* `canvas` (`HTMLCanvasElement`)
* `options?` (`Partial<RendererOptions> | undefined`)

###### Returns

`CanvasRenderer`.

###### Extends

* `BaseRenderer`
* `Renderer`

### `CanvasRenderer#canvas`

###### Type

```ts
HTMLCanvasElement
```

### `CanvasRenderer#context`

###### Type

```ts
CanvasRenderingContext2D
```

### `CanvasRenderer#getTileImageData(data, index)`

###### Parameters

* `data` (`ImageData`)
* `index` (`number`)

###### Returns

`number`.

### `CanvasRenderer#getTileSize(data)`

###### Parameters

* `data` (`ImageData`)

###### Returns

`[number, number]`.

### `CanvasRenderer#render()`

###### Parameters

There are no parameters.

###### Returns

`Promise<void>`.

### `new WebGL2Renderer(gl, options)`

Creates an instance of WebGL2Renderer.

###### Parameters

* `gl` (`WebGL2RenderingContext`)
  * WebGL 2 rendering context
* `options?` (`Partial<RendererOptions> | undefined`)
  * options

###### Returns

`WebGL2Renderer`.

###### Extends

* `BaseRenderer`
* `Renderer`

### `WebGL2Renderer#addEventListenersToWebGL2WarpedMap(webgl2WarpedMap)`

###### Parameters

* `webgl2WarpedMap` (`WebGL2WarpedMap`)

###### Returns

`void`.

### `WebGL2Renderer#animating`

###### Type

```ts
false
```

### `WebGL2Renderer#animationProgress`

###### Type

```ts
0
```

### `WebGL2Renderer#cancelThrottledFunctions()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#changed()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#clear()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#clearMap(mapId)`

###### Parameters

* `mapId` (`string`)

###### Returns

`void`.

### `WebGL2Renderer#contextLost()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#contextRestored()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#destroy()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#disableRender`

###### Type

```ts
false
```

### `WebGL2Renderer#distortionChanged(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WebGL2Renderer#getColorizeOptions()`

Get the colorize options of the renderer

###### Parameters

There are no parameters.

###### Returns

`Partial<Partial<{color: Color}>> | undefined`.

### `WebGL2Renderer#getGridOptions()`

Get the grid options of the renderer

###### Parameters

There are no parameters.

###### Returns

`Partial<Partial<{enabled: boolean}>> | undefined`.

### `WebGL2Renderer#getMapColorizeOptions(mapId)`

Get the colorize options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

Colorize options (`Partial<Partial<{color: Color}>> | undefined`).

### `WebGL2Renderer#getMapGridOptions(mapId)`

Get the grid options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`Partial<Partial<{enabled: boolean}>> | undefined`.

### `WebGL2Renderer#getMapOpacity(mapId)`

Get the opacity of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`number | undefined`.

### `WebGL2Renderer#getMapRemoveColorOptions(mapId)`

Get the remove color options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`  | Partial<Partial<{color: Color; threshold: number; hardness: number}>>
  | undefined`.

### `WebGL2Renderer#getMapSaturation(mapId)`

Get the saturation of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`number | undefined`.

### `WebGL2Renderer#getOpacity()`

Get the opacity of the renderer

###### Parameters

There are no parameters.

###### Returns

`number | undefined`.

### `WebGL2Renderer#getRemoveColorOptions()`

Get the remove color options of the renderer

###### Parameters

There are no parameters.

###### Returns

`  | Partial<Partial<{color: Color; threshold: number; hardness: number}>>
  | undefined`.

### `WebGL2Renderer#getSaturation()`

Get the saturation of the renderer

###### Parameters

There are no parameters.

###### Returns

`number`.

### `WebGL2Renderer#gl`

###### Type

```ts
WebGL2RenderingContext
```

### `WebGL2Renderer#imageInfoLoaded(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WebGL2Renderer#initializeWebGL(gl)`

###### Parameters

* `gl` (`WebGL2RenderingContext`)

###### Returns

`void`.

### `WebGL2Renderer#lastAnimationFrameRequestId`

###### Type

```ts
number | undefined
```

### `WebGL2Renderer#linesProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2Renderer#mapProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2Renderer#mapTileLoaded(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WebGL2Renderer#mapTileRemoved(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WebGL2Renderer#opacity`

###### Type

```ts
DEFAULT_OPACITY
```

### `WebGL2Renderer#pointsProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2Renderer#preChange(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WebGL2Renderer#prepareRenderInternal()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#previousSignificantViewport`

###### Type

```ts
Viewport | undefined
```

### `WebGL2Renderer#removeEventListenersFromWebGL2WarpedMap(webgl2WarpedMap)`

###### Parameters

* `webgl2WarpedMap` (`WebGL2WarpedMap`)

###### Returns

`void`.

### `WebGL2Renderer#render(viewport)`

Render the map for a given viewport

###### Parameters

* `viewport` (`Viewport`)
  * the current viewport

###### Returns

`void`.

### `WebGL2Renderer#renderInternal()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#renderLinesInternal()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#renderMapsInternal()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#renderOptions`

###### Type

```ts
any
```

### `WebGL2Renderer#renderPointsInternal()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#resetColorizeOptions()`

Reset the colorize options of the renderer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#resetGridOptions()`

Reset the grid options of the renderer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#resetMapColorizeOptions(mapId)`

Reset the colorize options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WebGL2Renderer#resetMapGridOptions(mapId)`

Reset the grid options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WebGL2Renderer#resetMapOpacity(mapId)`

Rreset the opacity of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WebGL2Renderer#resetMapRemoveColorOptions(mapId)`

Reset the remove color options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WebGL2Renderer#resetMapSaturation(mapId)`

Reset the saturation of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WebGL2Renderer#resetOpacity()`

Reset the opacity of the renderer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#resetRemoveColorOptions()`

Reset the remove color options of the renderer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#resetSaturation()`

Reset the satuation of the renderer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#saturation`

###### Type

```ts
DEFAULT_SATURATION
```

### `WebGL2Renderer#setColorizeOptions(colorizeOptions)`

Set the colorize options of the renderer

###### Parameters

* `colorizeOptions` (`{color?: Color | undefined}`)
  * the colorize options to set

###### Returns

`void`.

### `WebGL2Renderer#setGridOptions(gridOptions)`

Set the grid options of the renderer

###### Parameters

* `gridOptions` (`{enabled?: boolean | undefined}`)
  * the grid options to set

###### Returns

`void`.

### `WebGL2Renderer#setLinesProgramMapUniforms(webgl2WarpedMap)`

###### Parameters

* `webgl2WarpedMap` (`WebGL2WarpedMap`)

###### Returns

`void`.

### `WebGL2Renderer#setLinesProgramUniforms()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#setMapColorizeOptions(mapId, colorizeOptions)`

Set the colorize options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `colorizeOptions` (`{color?: Color | undefined}`)
  * the colorize options to set

###### Returns

`void`.

### `WebGL2Renderer#setMapGridOptions(mapId, gridOptions)`

Set the grid options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `gridOptions` (`{enabled?: boolean | undefined}`)
  * the grid options to set

###### Returns

`void`.

### `WebGL2Renderer#setMapOpacity(mapId, opacity)`

Set the opacity of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `opacity` (`number`)
  * opacity to set

###### Returns

`void`.

### `WebGL2Renderer#setMapProgramMapUniforms(webgl2WarpedMap)`

###### Parameters

* `webgl2WarpedMap` (`WebGL2WarpedMap`)

###### Returns

`void`.

### `WebGL2Renderer#setMapProgramRenderOptionsUniforms(layerRenderOptions, mapRenderOptions)`

###### Parameters

* `layerRenderOptions` (`{
    removeColorOptions?: RemoveColorOptions | undefined
    colorizeOptions?: ColorizeOptions | undefined
    gridOptions?: GridOptions | undefined
  }`)
* `mapRenderOptions` (`{
    removeColorOptions?: RemoveColorOptions | undefined
    colorizeOptions?: ColorizeOptions | undefined
    gridOptions?: GridOptions | undefined
  }`)

###### Returns

`void`.

### `WebGL2Renderer#setMapProgramUniforms()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#setMapRemoveColorOptions(mapId, removeColorOptions)`

Set the remove color options of a map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `removeColorOptions` (`{
    color?: Color | undefined
    threshold?: number | undefined
    hardness?: number | undefined
  }`)
  * the 'remove color options' to set

###### Returns

`void`.

### `WebGL2Renderer#setMapSaturation(mapId, saturation)`

Set the saturation of a map

0 - grayscale, 1 - original colors

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `saturation` (`number`)
  * the saturation to set

###### Returns

`void`.

### `WebGL2Renderer#setOpacity(opacity)`

Set the opacity of the renderer

###### Parameters

* `opacity` (`number`)
  * opacity to set

###### Returns

`void`.

### `WebGL2Renderer#setPointsProgramMapUniforms(webgl2WarpedMap)`

###### Parameters

* `webgl2WarpedMap` (`WebGL2WarpedMap`)

###### Returns

`void`.

### `WebGL2Renderer#setPointsProgramUniforms()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2Renderer#setRemoveColorOptions(removeColorOptions)`

Set the remove color options of the renderer

###### Parameters

* `removeColorOptions` (`{
    color?: Color | undefined
    threshold?: number | undefined
    hardness?: number | undefined
  }`)

###### Returns

`void`.

### `WebGL2Renderer#setSaturation(saturation)`

Set the saturation of the renderer

0 - grayscale, 1 - original colors

###### Parameters

* `saturation` (`number`)
  * the satuation to set

###### Returns

`void`.

### `WebGL2Renderer#shouldAnticipateInteraction()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WebGL2Renderer#shouldRequestFetchableTiles()`

###### Parameters

There are no parameters.

###### Returns

`boolean`.

### `WebGL2Renderer#startTransformationTransition(mapIds)`

###### Parameters

* `mapIds` (`Array<string>`)

###### Returns

`void`.

### `WebGL2Renderer#throttledChanged`

###### Type

```ts
DebouncedFunc<() => void>
```

### `WebGL2Renderer#throttledPrepareRenderInternal`

###### Type

```ts
DebouncedFunc<() => void>
```

### `WebGL2Renderer#transformationChanged(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WebGL2Renderer#transformationTransitionFrame(now, mapIds)`

###### Parameters

* `now` (`number`)
* `mapIds` (`Array<string>`)

###### Returns

`void`.

### `WebGL2Renderer#transformationTransitionStart`

###### Type

```ts
number | undefined
```

### `WebGL2Renderer#updateMapsForViewport(tiles)`

###### Parameters

* `tiles` (`Array<FetchableTile>`)

###### Returns

`{mapsEnteringViewport: string[]; mapsLeavingViewport: string[]}`.

### `WebGL2Renderer#warpedMapAdded(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `new WebGL2WarpedMap(mapId, georeferencedMap, gl, mapProgram, linesProgram, pointsProgram, options)`

Creates an instance of WebGL2WarpedMap.

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `georeferencedMap` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; id: string; ...`)
  * Georeferenced map used to construct the WarpedMap
* `gl` (`WebGL2RenderingContext`)
  * WebGL rendering context
* `mapProgram` (`WebGLProgram`)
  * WebGL program for map
* `linesProgram` (`WebGLProgram`)
* `pointsProgram` (`WebGLProgram`)
* `options?` (`Partial<WarpedMapOptions> | undefined`)
  * WarpedMapOptions

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
Array<never>
```

### `WebGL2WarpedMap#cachedTilesResourceOriginPointsAndDimensionsTexture`

###### Type

```ts
null
```

### `WebGL2WarpedMap#cachedTilesScaleFactorsTexture`

###### Type

```ts
null
```

### `WebGL2WarpedMap#cachedTilesTextureArray`

###### Type

```ts
null
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

### `WebGL2WarpedMap#destroy()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#getCachedTilesAtOtherScaleFactors(tile)`

###### Parameters

* `tile` (`{
    column: number
    row: number
    tileZoomLevel: TileZoomLevel
    imageSize: Size
  }`)

###### Returns

`Array<CachedTile<ImageData>>`.

### `WebGL2WarpedMap#gl`

###### Type

```ts
WebGL2RenderingContext
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

### `WebGL2WarpedMap#invertedRenderTransform`

###### Type

```ts
[number, number, number, number, number, number]
```

### `WebGL2WarpedMap#lineLayers`

###### Type

```ts
Array<never>
```

### `WebGL2WarpedMap#linesProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2WarpedMap#linesVao`

###### Type

```ts
null
```

### `WebGL2WarpedMap#mapProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2WarpedMap#mapVao`

###### Type

```ts
null
```

### `WebGL2WarpedMap#opacity`

###### Type

```ts
DEFAULT_OPACITY
```

### `WebGL2WarpedMap#parsedImage`

###### Type

```ts
Image
```

### `WebGL2WarpedMap#pointLayers`

###### Type

```ts
Array<never>
```

### `WebGL2WarpedMap#pointsProgram`

###### Type

```ts
WebGLProgram
```

### `WebGL2WarpedMap#pointsVao`

###### Type

```ts
null
```

### `WebGL2WarpedMap#previousCachedTilesForTexture`

###### Type

```ts
Array<never>
```

### `WebGL2WarpedMap#removeCachedTileAndUpdateTextures(tileUrl)`

Remove cached tile from the textures of this map and update textures

###### Parameters

* `tileUrl` (`string`)

###### Returns

`void`.

### `WebGL2WarpedMap#renderOptions`

###### Type

```ts
any
```

### `WebGL2WarpedMap#saturation`

###### Type

```ts
DEFAULT_SATURATION
```

### `WebGL2WarpedMap#setLineLayers()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#setPointLayers()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#throttledUpdateTextures`

###### Type

```ts
DebouncedFunc<() => Promise<void>>
```

### `WebGL2WarpedMap#tileInCachedTiles(tile)`

###### Parameters

* `tile` (`{
    column: number
    row: number
    tileZoomLevel: TileZoomLevel
    imageSize: Size
  }`)

###### Returns

`boolean`.

### `WebGL2WarpedMap#tileToCachedTile(tile)`

###### Parameters

* `tile` (`{
    column: number
    row: number
    tileZoomLevel: TileZoomLevel
    imageSize: Size
  }`)

###### Returns

`CachedTile<ImageData> | undefined`.

### `WebGL2WarpedMap#updateCachedTilesForTextures()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WebGL2WarpedMap#updateTextures()`

###### Parameters

There are no parameters.

###### Returns

`Promise<void>`.

### `WebGL2WarpedMap#updateVertexBuffers(projectedGeoToClipTransform)`

Update the vertex buffers of this warped map

###### Parameters

* `projectedGeoToClipTransform` (`[number, number, number, number, number, number]`)
  * Transform from projected geo coordinates to webgl2 coordinates in the \[-1, 1] range. Equivalent to OpenLayers' projectionTransform.

###### Returns

`void`.

### `WebGL2WarpedMap#updateVertexBuffersLines(projectedGeoToClipTransform)`

###### Parameters

* `projectedGeoToClipTransform` (`[number, number, number, number, number, number]`)

###### Returns

`void`.

### `WebGL2WarpedMap#updateVertexBuffersMap(projectedGeoToClipTransform)`

###### Parameters

* `projectedGeoToClipTransform` (`[number, number, number, number, number, number]`)

###### Returns

`void`.

### `WebGL2WarpedMap#updateVertexBuffersPoints(projectedGeoToClipTransform)`

###### Parameters

* `projectedGeoToClipTransform` (`[number, number, number, number, number, number]`)

###### Returns

`void`.
