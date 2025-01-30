# @allmaps/render

Allmaps render module. Renders georeferenced IIIF maps specified by a Georeference Annotation.

The following renderers are implemented:

- `CanvasRenderer`: renders WarpedMaps to a HTML Canvas element with the Canvas 2D API
- `WebGL2Renderer`: renders WarpedMaps to a WebGL 2 context
- `IntArrayRenderer`: renders WarpedMaps to an IntArray

This module is mainly used in the Allmaps pipeline by the following packages:

- [Allmaps plugin for Leaflet](../leaflet/)
- [Allmaps plugin for MapLibre](../maplibre/)
- [Allmaps plugin for OpenLayers](../openlayers/)

It is also used in the [Allmaps Preview](../../apps/preview/) app.

## How it works

The render module accomplishes this task with the following classes:

- Most renderers use the concept of a **`Viewport`**, describing coordinate reach that should be rendered.
- All renderers extend the **`BaseRenderer`** class, which implements the general actions of the (automatically throttled) `render()` calls: checking which maps are inside the current viewport, initially loading their image informations, checking which zoomlevel corresponds to the viewport, getting the IIIF tiles of that zoomlevel that are within the viewport.
  - For the `WebGL2Renderer`, a `WebGL2RenderingContext` contains the rendering context for the drawing surface of an HTML element, and a `WebGLProgram` stores the vertex and fragment shader used for rendering a map, its lines and points.
- A **`WarpedMap`** is made from every Georeference Annotation loaded added to the renderer and hence to its warpedMapList. It contains useful properties like mask, center, size ... in resource, geospatial and projected geospatial coordinates. It contains a copy of the ground control points (GCPs) and resource masks, a projected version of the GCPs, a transformation built using the latter and usable to transform points from IIIF resource coordinates to projected geospatial coordinates.
  - If `WebGL2Renderer` is used, a **`TriangulatedWarpedMap`** is created for every WarpedMap, finely triangulating the map, and a **`WebGL2WarpedMap`** is created, containing the WebGL2 information of the map (buffers etc.).
- A **`WarpedMapList`** contains the list of WarpedMaps to draw and uses an **`RTree`** for geospatial map lookup.
- A **`TileCache`** fetches and stores the image data of cached IIIF tiles.

### From Georeference Annotation to a rendered map

During a `CanvasRenderer` or `IntArrayRenderer` render call, a map undergoes the following steps from Georeference Annotation to the canvas:

- For each viewport pixel, from its viewport coordinates its projectedGeo coordinates is obtained and transformed to its corresponding resource coordinates, i.e. it's location in the IIIF image.
- We find the tile on which this point is located, and express the resource coordinates in local tile coordinates.
- We set the color of this pixel from the colors of the four tile pixels surrounding the tile point, through a bilinear interpolation.

During a `WebGL2Renderer` render call, a map undergoes the following steps from Georeference Annotation to the canvas:

- The resource mask is triangulated: the area within is divided into small triangles.
- The optimal tile zoom level for the current viewport is searched, telling us which IIIF tile [`scaleFactor`](https://iiif.io/api/image/3.0/#54-tiles) to use.
- The Viewport is transformed backwards from projected geospatial coordinates to resource coordinates of the IIIF image. The IIIF tiles covering this viewport on the resource image are fetched and cached in the TileCache.
- The area inside the resource mask is rendered in the viewport, triangle by triangle, using the cached tiles. The location of where to render each triangle is computed using the forward transformation built from the GPCs.

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

- `viewport...` indicates properties described in viewport coordinates
- `canvas...` indicates properties described in canvas coordinates (i.e. viewport but with device pixel ratio taken into account)
- `resource...` indicates properties described in resource coordinates (i.e. IIIF tile coordinates of zoomlevel 1)
- `geo...` indicates properties described in geospatial coordinates ('WGS84', i.e. `[lon, lat]`)
- `projectedGeo...` indicates properties described in projected geospatial coordinates (following a CRS, by default 'EPSG:3857' WebMercator)
- `tile...` indicates properties described IIIF tile coordinates

## API

### `new WarpedMapEvent(type, data)`

###### Parameters

- `type` (`WarpedMapEventType`)
- `data?` (`unknown`)

###### Returns

`WarpedMapEvent`.

###### Extends

- `Event`

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
