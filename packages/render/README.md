# @allmaps/render

Allmaps render module. Renders georeferenced IIIF maps specified by a Georeference Annotation.

The following renderers are implemented:

*   `CanvasRenderer`: renders WarpedMaps to a HTML Canvas element with the Canvas 2D API
*   `WebGL2Renderer`: renders WarpedMaps to a WebGL 2 context
*   `IntArrayRenderer`: renders WarpedMaps to an IntArray

This module is mainly used in the Allmaps pipeline by the following packages:

*   [Allmaps plugin for Leaflet](../leaflet/)
*   [Allmaps plugin for MapLibre](../maplibre/)
*   [Allmaps plugin for OpenLayers](../openlayers/)

It is also used in the [Allmaps Preview](../../apps/preview/) app.

## How it works

The render module accomplishes this task with the following classes:

*   Most renderers use the concept of a **`Viewport`**, describing coordinate reach that should be rendered.
*   All renderers extend the **`BaseRenderer`** class, which implements the general actions of the (automatically throttled) `render()` calls: checking which maps are inside the current viewport, initially loading their image informations, checking which zoomlevel corresponds to the viewport, getting the IIIF tiles of that zoomlevel that are within the viewport.
    *   For the `WebGL2Renderer`, a `WebGL2RenderingContext` contains the rendering context for the drawing surface of an HTML element, and a `WebGLProgram` stores the vertex and fragment shader used for rendering a map, its lines and points.
*   A **`WarpedMap`** is made from every Georeference Annotation loaded added to the renderer and hence to its warpedMapList. It contains useful properties like mask, center, size ... in resource, geospatial and projected geospatial coordinates. It contains a copy of the ground control points (GCPs) and resource masks, a projected version of the GCPs, a transformation built using the latter and usable to transform points from IIIF resource coordinates to projected geospatial coordinates.
    *   If `WebGL2Renderer` is used, a **`TriangulatedWarpedMap`** is created for every WarpedMap, finely triangulating the map, and a **`WebGL2WarpedMap`** is created, containing the WebGL2 information of the map (buffers etc.).
*   A **`WarpedMapList`** contains the list of WarpedMaps to draw and uses an **`RTree`** for geospatial map lookup.
*   A **`TileCache`** fetches and stores the image data of cached IIIF tiles.

### From Georeference Annotation to a rendered map

During a `CanvasRenderer` or `IntArrayRenderer` render call, a map undergoes the following steps from Georeference Annotation to the canvas:

*   For each viewport pixel, from its viewport coordinates its projectedGeo coordinates is obtained and transformed to its corresponding resource coordinates, i.e. it's location in the IIIF image.
*   We find the tile on which this point is located, and express the resource coordinates in local tile coordinates.
*   We set the color of this pixel from the colors of the four tile pixels surrounding the tile point, through a bilinear interpolation.

During a `WebGL2Renderer` render call, a map undergoes the following steps from Georeference Annotation to the canvas:

*   The resource mask is triangulated: the area within is divided into small triangles.
*   The optimal tile zoom level for the current viewport is searched, telling us which IIIF tile [`scaleFactor`](https://iiif.io/api/image/3.0/#54-tiles) to use.
*   The Viewport is transformed backwards from projected geospatial coordinates to resource coordinates of the IIIF image. The IIIF tiles covering this viewport on the resource image are fetched and cached in the TileCache.
*   The area inside the resource mask is rendered in the viewport, triangle by triangle, using the cached tiles. The location of where to render each triangle is computed using the forward transformation built from the GPCs.

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
import { CanvasRenderer } from '@allmaps/render'

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
import { WebGL2Renderer } from '@allmaps/render'

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
import { IntArrayRenderer } from '@allmaps/render'

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

*   `viewport...` indicates properties described in viewport coordinates
*   `canvas...` indicates properties described in canvas coordinates (i.e. viewport but with device pixel ratio taken into account)
*   `resource...` indicates properties described in resource coordinates (i.e. IIIF tile coordinates of zoomlevel 1)
*   `geo...` indicates properties described in geospatial coordinates ('WGS84', i.e. `[lon, lat]`)
*   `projectedGeo...` indicates properties described in projected geospatial coordinates (following a CRS, by default 'EPSG:3857' WebMercator)
*   `tile...` indicates properties described IIIF tile coordinates

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [constructor](#constructor)
    *   [Parameters](#parameters)
*   [computeProjectedGeoRectangle](#computeprojectedgeorectangle)
    *   [Parameters](#parameters-1)
*   [fromWarpedMapList](#fromwarpedmaplist)
    *   [Parameters](#parameters-2)
*   [fromProjectedGeoBbox](#fromprojectedgeobbox)
    *   [Parameters](#parameters-3)
*   [constructor](#constructor-1)
    *   [Parameters](#parameters-4)
*   [getViewportMask](#getviewportmask)
    *   [Parameters](#parameters-5)
*   [getViewportMaskBbox](#getviewportmaskbbox)
    *   [Parameters](#parameters-6)
*   [getViewportMaskRectangle](#getviewportmaskrectangle)
    *   [Parameters](#parameters-7)
*   [getViewportFullMask](#getviewportfullmask)
    *   [Parameters](#parameters-8)
*   [getViewportFullMaskBbox](#getviewportfullmaskbbox)
    *   [Parameters](#parameters-9)
*   [getViewportFullMaskRectangle](#getviewportfullmaskrectangle)
    *   [Parameters](#parameters-10)
*   [getResourceToViewportScale](#getresourcetoviewportscale)
    *   [Parameters](#parameters-11)
*   [getResourceToCanvasScale](#getresourcetocanvasscale)
    *   [Parameters](#parameters-12)
*   [getReferenceScale](#getreferencescale)
*   [setResourceMask](#setresourcemask)
    *   [Parameters](#parameters-13)
*   [setTransformationType](#settransformationtype)
    *   [Parameters](#parameters-14)
*   [setDistortionMeasure](#setdistortionmeasure)
    *   [Parameters](#parameters-15)
*   [setGcps](#setgcps)
    *   [Parameters](#parameters-16)
*   [setTileZoomLevelForViewport](#settilezoomlevelforviewport)
    *   [Parameters](#parameters-17)
*   [setOverviewTileZoomLevelForViewport](#setoverviewtilezoomlevelforviewport)
    *   [Parameters](#parameters-18)
*   [setProjectedGeoBufferedViewportRectangleForViewport](#setprojectedgeobufferedviewportrectangleforviewport)
    *   [Parameters](#parameters-19)
*   [setResourceBufferedViewportRingForViewport](#setresourcebufferedviewportringforviewport)
    *   [Parameters](#parameters-20)
*   [setFetchableTilesForViewport](#setfetchabletilesforviewport)
    *   [Parameters](#parameters-21)
*   [setOverviewFetchableTilesForViewport](#setoverviewfetchabletilesforviewport)
    *   [Parameters](#parameters-22)
*   [resetForViewport](#resetforviewport)
*   [resetPrevious](#resetprevious)
*   [mixPreviousAndNew](#mixpreviousandnew)
    *   [Parameters](#parameters-23)
*   [hasImageInfo](#hasimageinfo)
*   [loadImageInfo](#loadimageinfo)
*   [constructor](#constructor-2)
    *   [Parameters](#parameters-24)
*   [setResourceMask](#setresourcemask-1)
    *   [Parameters](#parameters-25)
*   [resetPrevious](#resetprevious-1)
*   [mixPreviousAndNew](#mixpreviousandnew-1)
    *   [Parameters](#parameters-26)
*   [updateTriangulation](#updatetriangulation)
*   [updateTrianglePoints](#updatetrianglepoints)
*   [updateTrianglePointsDistortion](#updatetrianglepointsdistortion)
*   [constructor](#constructor-3)
    *   [Parameters](#parameters-27)
*   [updateVertexBuffers](#updatevertexbuffers)
    *   [Parameters](#parameters-28)
*   [clearTextures](#cleartextures)
*   [addCachedTileAndUpdateTextures](#addcachedtileandupdatetextures)
    *   [Parameters](#parameters-29)
*   [removeCachedTileAndUpdateTextures](#removecachedtileandupdatetextures)
    *   [Parameters](#parameters-30)
*   [constructor](#constructor-4)
    *   [Parameters](#parameters-31)
*   [getMapIds](#getmapids)
*   [getWarpedMap](#getwarpedmap)
    *   [Parameters](#parameters-32)
*   [getMapZIndex](#getmapzindex)
    *   [Parameters](#parameters-33)
*   [getBbox](#getbbox)
*   [getProjectedBbox](#getprojectedbbox)
*   [getMapsByGeoBbox](#getmapsbygeobbox)
    *   [Parameters](#parameters-34)
*   [setImageInformations](#setimageinformations)
    *   [Parameters](#parameters-35)
*   [setMapResourceMask](#setmapresourcemask)
    *   [Parameters](#parameters-36)
*   [setMapsTransformationType](#setmapstransformationtype)
    *   [Parameters](#parameters-37)
*   [setMapsDistortionMeasure](#setmapsdistortionmeasure)
    *   [Parameters](#parameters-38)
*   [bringMapsToFront](#bringmapstofront)
    *   [Parameters](#parameters-39)
*   [sendMapsToBack](#sendmapstoback)
    *   [Parameters](#parameters-40)
*   [bringMapsForward](#bringmapsforward)
    *   [Parameters](#parameters-41)
*   [sendMapsBackward](#sendmapsbackward)
    *   [Parameters](#parameters-42)
*   [showMaps](#showmaps)
    *   [Parameters](#parameters-43)
*   [hideMaps](#hidemaps)
    *   [Parameters](#parameters-44)
*   [addGeoreferencedMap](#addgeoreferencedmap)
    *   [Parameters](#parameters-45)
*   [removeGeoreferencedMap](#removegeoreferencedmap)
    *   [Parameters](#parameters-46)
*   [addGeoreferenceAnnotation](#addgeoreferenceannotation)
    *   [Parameters](#parameters-47)
*   [removeGeoreferenceAnnotation](#removegeoreferenceannotation)
    *   [Parameters](#parameters-48)
*   [constructor](#constructor-5)
    *   [Parameters](#parameters-49)
*   [isCachedTile](#iscachedtile)
*   [abort](#abort)
*   [constructor](#constructor-6)
    *   [Parameters](#parameters-50)
*   [fetch](#fetch)
*   [fetch](#fetch-1)
*   [fetch](#fetch-2)
*   [fetch](#fetch-3)
*   [getCacheableTiles](#getcacheabletiles)
*   [getCacheableTile](#getcacheabletile)
    *   [Parameters](#parameters-51)
*   [getMapCacheableTiles](#getmapcacheabletiles)
    *   [Parameters](#parameters-52)
*   [getCachedTiles](#getcachedtiles)
*   [getCachedTile](#getcachedtile)
    *   [Parameters](#parameters-53)
*   [getMapCachedTiles](#getmapcachedtiles)
    *   [Parameters](#parameters-54)
*   [getTileUrls](#gettileurls)
*   [getMapTileUrls](#getmaptileurls)
    *   [Parameters](#parameters-55)
*   [requestFetchableTiles](#requestfetchabletiles)
    *   [Parameters](#parameters-56)
*   [allRequestedTilesLoaded](#allrequestedtilesloaded)
*   [prune](#prune)
    *   [Parameters](#parameters-57)
*   [addGeoreferenceAnnotation](#addgeoreferenceannotation-1)
    *   [Parameters](#parameters-58)
*   [addGeoreferencedMap](#addgeoreferencedmap-1)
    *   [Parameters](#parameters-59)
*   [constructor](#constructor-7)
    *   [Parameters](#parameters-60)
*   [getOpacity](#getopacity)
*   [setOpacity](#setopacity)
    *   [Parameters](#parameters-61)
*   [resetOpacity](#resetopacity)
*   [getMapOpacity](#getmapopacity)
    *   [Parameters](#parameters-62)
*   [setMapOpacity](#setmapopacity)
    *   [Parameters](#parameters-63)
*   [resetMapOpacity](#resetmapopacity)
    *   [Parameters](#parameters-64)
*   [getRemoveColorOptions](#getremovecoloroptions)
*   [setRemoveColorOptions](#setremovecoloroptions)
    *   [Parameters](#parameters-65)
*   [resetRemoveColorOptions](#resetremovecoloroptions)
*   [getMapRemoveColorOptions](#getmapremovecoloroptions)
    *   [Parameters](#parameters-66)
*   [setMapRemoveColorOptions](#setmapremovecoloroptions)
    *   [Parameters](#parameters-67)
*   [resetMapRemoveColorOptions](#resetmapremovecoloroptions)
    *   [Parameters](#parameters-68)
*   [getColorizeOptions](#getcolorizeoptions)
*   [setColorizeOptions](#setcolorizeoptions)
    *   [Parameters](#parameters-69)
*   [resetColorizeOptions](#resetcolorizeoptions)
*   [getMapColorizeOptions](#getmapcolorizeoptions)
    *   [Parameters](#parameters-70)
*   [setMapColorizeOptions](#setmapcolorizeoptions)
    *   [Parameters](#parameters-71)
*   [resetMapColorizeOptions](#resetmapcolorizeoptions)
    *   [Parameters](#parameters-72)
*   [getGridOptions](#getgridoptions)
*   [setGridOptions](#setgridoptions)
    *   [Parameters](#parameters-73)
*   [resetGridOptions](#resetgridoptions)
*   [getMapGridOptions](#getmapgridoptions)
    *   [Parameters](#parameters-74)
*   [setMapGridOptions](#setmapgridoptions)
    *   [Parameters](#parameters-75)
*   [resetMapGridOptions](#resetmapgridoptions)
    *   [Parameters](#parameters-76)
*   [getSaturation](#getsaturation)
*   [setSaturation](#setsaturation)
    *   [Parameters](#parameters-77)
*   [resetSaturation](#resetsaturation)
*   [getMapSaturation](#getmapsaturation)
    *   [Parameters](#parameters-78)
*   [setMapSaturation](#setmapsaturation)
    *   [Parameters](#parameters-79)
*   [resetMapSaturation](#resetmapsaturation)
    *   [Parameters](#parameters-80)
*   [render](#render)
    *   [Parameters](#parameters-81)
*   [fetch](#fetch-4)

### constructor

Creates a new Viewport

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `o` &#x20;
*   `i` &#x20;
*   `s`   (optional, default `1`)
*   `viewportSize` **Size** Size of the viewport in viewport pixels, as \[width, height].
*   `projectedGeoCenter` **Point** Center point of the viewport, in projected coordinates.
*   `projectedGeoPerViewportScale` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Scale of the viewport, in projection coordinates per viewport pixel.
*   `rotation` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Rotation of the viewport with respect to the project coordinate system.
*   `devicePixelRatio` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The devicePixelRatio of the viewport. (optional, default `1`)

### computeProjectedGeoRectangle

Returns a rotated rectangle in projected geo coordinates

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `o` &#x20;
*   `i` &#x20;

### fromWarpedMapList

Static method creates that creates a Viewport from a WarpedMapList

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `o` &#x20;
*   `i`   (optional, default `"contain"`)
*   `s`   (optional, default `1`)
*   `viewportSize` **Size** Size of the viewport in viewport pixels, as \[width, height].
*   `warpedMapList` **WarpedMapList\<W>** A WarpedMapList.
*   `devicePixelRatio` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** The devicePixelRatio of the viewport.
*   `fit` **Fit** Whether the viewport should contain or cover the bbox of the warpedMapList. (optional, default `'contain'`)

Returns **Viewport** A new Viewport object

### fromProjectedGeoBbox

Static method creates that creates a Viewport from Bbox in projected geospatial coordinates.

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `o` &#x20;
*   `i`   (optional, default `"contain"`)
*   `viewportSize` **Size** Size of the viewport in viewport pixels, as \[width, height].
*   `projectedGeoBbox` **WarpedMapList\<W>** A projectedGeoBbox.
*   `devicePixelRatio` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** The devicePixelRatio of the viewport.
*   `fit` **Fit** Whether the viewport should contain or cover the bbox of the warpedMapList. (optional, default `'contain'`)

Returns **Viewport** A new Viewport object

### constructor

Creates an instance of WarpedMap.

#### Parameters

*   `e` &#x20;
*   `r` &#x20;
*   `o` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `georeferencedMap` **GeoreferencedMap** Georeferenced map used to construct the WarpedMap
*   `options` **WarpedMapOptions?** options

### getViewportMask

Get resourceMask in viewport coordinates

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **Ring**&#x20;

### getViewportMaskBbox

Get Bbox of resourceMask in viewport coordinates

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **Bbox**&#x20;

### getViewportMaskRectangle

Get resourceMaskRectangle in viewport coordinates

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **Rectangle**&#x20;

### getViewportFullMask

Get resourceFullMask in viewport coordinates

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **Ring**&#x20;

### getViewportFullMaskBbox

Get bbox of rresourceFullMask in viewport coordinates

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **Bbox**&#x20;

### getViewportFullMaskRectangle

Get resourceFullMaskRectangle in viewport coordinates

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **Rectangle**&#x20;

### getResourceToViewportScale

Get scale of the warped map, in resource pixels per viewport pixels.

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

### getResourceToCanvasScale

Get scale of the warped map, in resource pixels per canvas pixels.

#### Parameters

*   `e` &#x20;
*   `viewport` **Viewport** the current viewport

Returns **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

### getReferenceScale

Get the reference scaling from the forward transformation of the projected Helmert transformer

Returns **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

### setResourceMask

Update the resourceMask loaded from a georeferenced map to a new mask.

#### Parameters

*   `e` &#x20;
*   `resourceMask` **Ring**&#x20;

### setTransformationType

Set the transformationType

#### Parameters

*   `e` &#x20;
*   `transformationType` **TransformationType**&#x20;

### setDistortionMeasure

Set the distortionMeasure

#### Parameters

*   `e` &#x20;
*   `distortionMeasure` **DistortionMeasure?** the disortion measure

### setGcps

Update the Ground Controle Points loaded from a georeferenced map to new Ground Controle Points.

#### Parameters

*   `e` &#x20;
*   `gcps` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<GCP>**&#x20;

### setTileZoomLevelForViewport

Set the tile zoom level for the current viewport

#### Parameters

*   `e` &#x20;
*   `tileZoomLevel` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** tile zoom level for the current viewport

### setOverviewTileZoomLevelForViewport

Set the overview tile zoom level for the current viewport

#### Parameters

*   `e` &#x20;
*   `tileZoomLevel` **TileZoomLevel?** tile zoom level for the current viewport

### setProjectedGeoBufferedViewportRectangleForViewport

Set projectedGeoBufferedViewportRectangle for the current viewport

#### Parameters

*   `e` &#x20;
*   `projectedGeoBufferedViewportRectangle` **Rectangle?**&#x20;

### setResourceBufferedViewportRingForViewport

Set resourceBufferedViewportRing for the current viewport

#### Parameters

*   `e` &#x20;
*   `resourceBufferedViewportRing` **Ring?**&#x20;

### setFetchableTilesForViewport

Set tiles for the current viewport

#### Parameters

*   `e` &#x20;
*   `fetchableTiles` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<FetchableTile>**&#x20;

### setOverviewFetchableTilesForViewport

Set overview tiles for the current viewport

#### Parameters

*   `e` &#x20;
*   `overviewFetchableTiles` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<FetchableTile>**&#x20;

### resetForViewport

Reset the properties for the current values

### resetPrevious

Reset the properties of the previous and new transformationType.

### mixPreviousAndNew

Mix the properties of the previous and new transformationType.

#### Parameters

*   `e` &#x20;
*   `t` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

### hasImageInfo

Check if this instance has image info

### loadImageInfo

Fetch and parse the image info, and generate the image ID

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>**&#x20;

### constructor

Creates an instance of a TriangulatedWarpedMap.

#### Parameters

*   `e` &#x20;
*   `i` &#x20;
*   `o` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `georeferencedMap` **GeoreferencedMap** Georeferenced map used to construct the WarpedMap
*   `options` **WarpedMapOptions?** Options

### setResourceMask

Update the resourceMask.

#### Parameters

*   `e` &#x20;
*   `resourceMask` **Ring**&#x20;

### resetPrevious

Reset the previous points and values.

### mixPreviousAndNew

Mix the previous and new points and values.

#### Parameters

*   `e` &#x20;
*   `t` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

### updateTriangulation

Update the (previous and new) triangulation of the resourceMask. Use cache if available.

### updateTrianglePoints

Derive the (previous and new) resource and projectedGeo points from their corresponding triangulations.

Also derive the (previous and new) triangulation-refined resource and projectedGeo mask

### updateTrianglePointsDistortion

Derive the (previous and new) distortions from their corresponding triangulations.

### constructor

Creates an instance of WebGL2WarpedMap.

#### Parameters

*   `e` &#x20;
*   `r` &#x20;
*   `o` &#x20;
*   `T` &#x20;
*   `h` &#x20;
*   `c` &#x20;
*   `i` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `georeferencedMap` **GeoreferencedMap** Georeferenced map used to construct the WarpedMap
*   `gl` **WebGL2RenderingContext** WebGL rendering context
*   `mapProgram` **[WebGLProgram](https://developer.mozilla.org/docs/Web/API/WebGLProgram)** WebGL program for map
*   `options` **Partial\<WarpedMapOptions>** WarpedMapOptions

### updateVertexBuffers

Update the vertex buffers of this warped map

#### Parameters

*   `e` &#x20;
*   `projectedGeoToClipTransform` **Transform** Transform from projected geo coordinates to webgl2 coordinates in the \[-1, 1] range. Equivalent to OpenLayers' projectionTransform.

### clearTextures

Clear textures for this map

### addCachedTileAndUpdateTextures

Add cached tile to the textures of this map and update textures

#### Parameters

*   `e` &#x20;
*   `cachedTile` **CachedTile**&#x20;

### removeCachedTileAndUpdateTextures

Remove cached tile from the textures of this map and update textures

#### Parameters

*   `e` &#x20;
*   `tileUrl` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

### constructor

Creates an instance of a WarpedMapList.

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `warpedMapFactory` **WarpedMapFactory\<W>?** Factory function for creating WarpedMap objects
*   `options` **WarpedMapListOptions?** Options

### getMapIds

Returns mapIds for the maps in this list.

Returns **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### getWarpedMap

Returns the WarpedMap object in this list of map specified by its ID.

#### Parameters

*   `e` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **(W | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### getMapZIndex

Returns the z-index of a map.

#### Parameters

*   `e` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### getBbox

Return the bounding box of all visible maps in this list, in geospatial coordinates ('WGS84', i.e. `[lon, lat]`)

Returns **(Bbox | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### getProjectedBbox

Return the bounding box of all visible maps in this list, in projected geospatial coordinates

Returns **(Bbox | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### getMapsByGeoBbox

Returns mapIds of the maps whose geoBbox overlaps with the specified geoBbox.

#### Parameters

*   `e` &#x20;
*   `geoBbox` **Bbox**&#x20;

Returns **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### setImageInformations

Sets the object that caches image information

#### Parameters

*   `e` &#x20;
*   `imageInformations` **ImageInformations** object that caches image information

### setMapResourceMask

Sets the resource mask for a specified map

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `resourceMask` **Ring** the new resource mask

### setMapsTransformationType

Sets the transformation type of specified maps

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** the IDs of the maps
*   `transformationType` **TransformationType** the new transformation type

### setMapsDistortionMeasure

Sets the distortion measure of specified maps

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** the IDs of the maps
*   `distortionMeasure` **DistortionMeasure?** the distortion measure

### bringMapsToFront

Changes the z-index of the specified maps to bring them to front

#### Parameters

*   `e` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### sendMapsToBack

Changes the z-index of the specified maps to send them to back

#### Parameters

*   `e` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### bringMapsForward

Changes the z-index of the specified maps to bring them forward

#### Parameters

*   `e` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### sendMapsBackward

Changes the zIndex of the specified maps to send them backward

#### Parameters

*   `e` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### showMaps

Changes the visibility of the specified maps to `true`

#### Parameters

*   `e` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### hideMaps

Changes the visibility of the specified maps to `false`

#### Parameters

*   `e` &#x20;
*   `mapIds` **Iterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### addGeoreferencedMap

Adds a georeferenced map to this list

#### Parameters

*   `e` &#x20;
*   `georeferencedMap` **unknown**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>**&#x20;

### removeGeoreferencedMap

Removes a georeferenced map from this list

#### Parameters

*   `e` &#x20;
*   `georeferencedMap` **unknown**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>**&#x20;

### addGeoreferenceAnnotation

Parses an annotation and adds its georeferenced map to this list

#### Parameters

*   `e` &#x20;
*   `annotation` **unknown**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>>**&#x20;

### removeGeoreferenceAnnotation

Parses an annotation and removes its georeferenced map from this list

#### Parameters

*   `e` &#x20;
*   `annotation` **unknown**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>>**&#x20;

### constructor

Creates an instance of CacheableTile.

#### Parameters

*   `t` &#x20;
*   `e` &#x20;
*   `fetchableTile` **FetchableTile**&#x20;
*   `fetchFn` **FetchFn?** Optional fetch function to use

### isCachedTile

Whether a tile has fetched its data

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

### abort

Abort the fetch

### constructor

Creates an instance of FetchableTile.

#### Parameters

*   `e` &#x20;
*   `t` &#x20;
*   `tile` **Tile** the tile
*   `warpedMap` **WarpedMapWithImageInfo** A WarpedMap with fetched image information

### fetch

Fetch the tile and create its ImageBitMap.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>**&#x20;

### fetch

Fetch the tile and create its ImageData object.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>**&#x20;

### fetch

Fetch the tile and create its IntArray data using the supplied getImageData function.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>**&#x20;

### fetch

Fetch the tile and create its ImageBitmap using a WebWorker.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>**&#x20;

### getCacheableTiles

Get the tiles in this cache

Returns **IterableIterator\<CacheableTile>**&#x20;

### getCacheableTile

Get a specific tile in this cache

#### Parameters

*   `e` &#x20;
*   `tileUrl` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** the URL of the requested tile

Returns **(CacheableTile | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### getMapCacheableTiles

Get the tiles in this cache, corresponding to a specific map

#### Parameters

*   `e` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<CacheableTile>**&#x20;

### getCachedTiles

Get the tiles in this cache that have been fetched

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<CacheableTile>**&#x20;

### getCachedTile

Get a specific cached tile in this cache that has been fetched

#### Parameters

*   `e` &#x20;
*   `tileUrl` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** the URL of the requested tile

Returns **(CachedTile | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### getMapCachedTiles

Get the tiles in this cache, corresponding to a specific map, that have been fetched

#### Parameters

*   `e` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<CachedTile>**&#x20;

### getTileUrls

Get the URLs of tiles in this cache

Returns **IterableIterator<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### getMapTileUrls

Get the URLs of tiles in this cache, corresponding to a specific map

#### Parameters

*   `e` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **IterableIterator<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

### requestFetchableTiles

Process the request for new tiles to be added to this cache

#### Parameters

*   `e` &#x20;
*   `fetchableTiles` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<FetchableTile>**&#x20;

### allRequestedTilesLoaded

Returns a promise that resolves when all requested tiles are loaded.
This could happen immidiately, in case there are no ongoing requests and the tilesFetchingCount is zero,
or in a while, when the count reaches zero and the ALLREQUESTEDTILESLOADED event is fired.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>**&#x20;

### prune

Prune tiles in this cache using the provided prune info

#### Parameters

*   `e` &#x20;

### addGeoreferenceAnnotation

Parses an annotation and adds its georeferenced map to this renderer's warped map list

#### Parameters

*   `e` &#x20;
*   `annotation` **unknown**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>>**&#x20;

### addGeoreferencedMap

Adds a georeferenced map to this renderer's warped map list

#### Parameters

*   `e` &#x20;
*   `georeferencedMap` **unknown**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>**&#x20;

### constructor

Creates an instance of WebGL2Renderer.

#### Parameters

*   `t` &#x20;
*   `r` &#x20;
*   `gl` **WebGL2RenderingContext** WebGL 2 rendering context
*   `options` **WebGL2RendererOptions** options

### getOpacity

Get the opacity of the renderer

Returns **([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setOpacity

Set the opacity of the renderer

#### Parameters

*   `t` &#x20;
*   `opacity` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** opacity to set

### resetOpacity

Reset the opacity of the renderer

### getMapOpacity

Get the opacity of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setMapOpacity

Set the opacity of a map

#### Parameters

*   `t` &#x20;
*   `r` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `opacity` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** opacity to set

### resetMapOpacity

Rreset the opacity of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

### getRemoveColorOptions

Get the remove color options of the renderer

Returns **(Partial\<RemoveColorOptions> | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setRemoveColorOptions

Set the remove color options of the renderer

#### Parameters

*   `t` &#x20;
*   `removeColorOptions` **RemoveColorOptions**&#x20;

### resetRemoveColorOptions

Reset the remove color options of the renderer

### getMapRemoveColorOptions

Get the remove color options of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **(Partial\<RemoveColorOptions> | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setMapRemoveColorOptions

Set the remove color options of a map

#### Parameters

*   `t` &#x20;
*   `r` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `removeColorOptions` **RemoveColorOptions** the 'remove color options' to set

### resetMapRemoveColorOptions

Reset the remove color options of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

### getColorizeOptions

Get the colorize options of the renderer

Returns **(Partial\<ColorizeOptions> | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setColorizeOptions

Set the colorize options of the renderer

#### Parameters

*   `t` &#x20;
*   `colorizeOptions` **ColorizeOptions** the colorize options to set

### resetColorizeOptions

Reset the colorize options of the renderer

### getMapColorizeOptions

Get the colorize options of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **(Partial\<ColorizeOptions> | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setMapColorizeOptions

Set the colorize options of a map

#### Parameters

*   `t` &#x20;
*   `r` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `colorizeOptions` **ColorizeOptions** the colorize options to set

### resetMapColorizeOptions

Reset the colorize options of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

### getGridOptions

Get the grid options of the renderer

Returns **(Partial\<GridOptions> | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setGridOptions

Set the grid options of the renderer

#### Parameters

*   `t` &#x20;
*   `gridOptions` **GridOptions** the grid options to set

### resetGridOptions

Reset the grid options of the renderer

### getMapGridOptions

Get the grid options of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **(Partial\<GridOptions> | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setMapGridOptions

Set the grid options of a map

#### Parameters

*   `t` &#x20;
*   `r` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map
*   `gridOptions` **GridOptions** the grid options to set

### resetMapGridOptions

Reset the grid options of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

### getSaturation

Get the saturation of the renderer

Returns **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

### setSaturation

Set the saturation of the renderer

0 - grayscale, 1 - original colors

#### Parameters

*   `t` &#x20;
*   `saturation`  the satuation to set

### resetSaturation

Reset the satuation of the renderer

### getMapSaturation

Get the saturation of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

Returns **([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | [undefined](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/undefined))**&#x20;

### setMapSaturation

Set the saturation of a map

0 - grayscale, 1 - original colors

#### Parameters

*   `t` &#x20;
*   `r` &#x20;
*   `mapId`  ID of the map
*   `saturation`  the saturation to set

### resetMapSaturation

Reset the saturation of a map

#### Parameters

*   `t` &#x20;
*   `mapId` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** ID of the map

### render

Render the map for a given viewport

#### Parameters

*   `t` &#x20;
*   `viewport` **Viewport** the current viewport

### fetch

Fetch the tile and create its ImageData using a WebWorker.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>**&#x20;
