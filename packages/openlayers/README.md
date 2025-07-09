# @allmaps/openlayers

Allmaps plugin for OpenLayers. Plugin that uses WebGL to show warped IIIF images on an OpenLayers map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/).

Allmaps plugin for [Leaflet](https://leafletjs.com/). This plugin allows displaying georeferenced [IIIF images](https://iiif.io/) on a Leaflet map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and uses WebGL to transform images from a IIIF image server to overlay them on their correct geographical position. See [allmaps.org](https://allmaps.org) for more information.

[![Example of the Allmaps plugin for OpenLayers](https://raw.githubusercontent.com/allmaps/allmaps/main/packages/openlayers/example.jpg)](https://observablehq.com/@allmaps/openlayers-plugin)

Examples:

* [Observable notebook](https://observablehq.com/@allmaps/openlayers-plugin)
* [HTML example using ESM and Skypack](https://allmaps.org/allmaps/packages/openlayers/examples/skypack.html)
* [HTML example using UMD and jsDelivr](https://allmaps.org/allmaps/packages/openlayers/examples/jsdelivr.html)

## How it works

This plugin exports the class `WarpedMapLayer`. You can add one or multiple Georeference Annotations (or AnnotationPages that contain multiple Georeference Annotations) to a WarpedMapLayer and add the WarpedMapLayer to your OpenLayers map. This will render all georeferenced maps defined by the Georeference Annotations.

To understand what happens under the hood for each georeferenced map, see the [@allmaps/render](../render/README.md) package.

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

As an alternative to loading using import, ESM and UMD bundled versions of the code are also provided under `/dist/bundled` (once the code is built). These are also published online, so can load them directly in a HTML script tag using a CDN.

```html
<script src="https://cdn.jsdelivr.net/npm/@allmaps/openlayers/dist/bundled/allmaps-openlayers-8.umd.js"></script>
```

When loading the bundled package, its classes are available under the `Allmaps` global variable:

```js
const warpedMapLayer = new Allmaps.WarpedMapLayer()
```

## Usage

Built for OpenLayers 8, but should work with OpenLayers 6 and OpenLayers 7 as well.

### Loading a Georeference Annotation

Creating a `WarpedMapLayer` and adding a Georeference Annotation to an OpenLayers map looks like this:

```js
import { WarpedMapLayer } from '@allmaps/openlayers'

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-71.00661, 42.37124]),
    zoom: 14
  })
})

// Create WarpedMapLayer
const warpedMapLayer = new WarpedMapLayer()

// Add the WarpedMapLayer to the map and load a Georeference Annotation
const annotationUrl = 'https://annotations.allmaps.org/maps/a9458d2f895dcdfb'
map.addLayer(warpedMapLayer)
warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
```

A Georeference Annotation can be added using the `addGeoreferenceAnnotation` and `addGeoreferenceAnnotationByUrl` functions:

```js
fetch(annotationUrl)
  .then((response) => response.json())
  .then((annotation) => warpedMapLayer.addGeoreferenceAnnotation(annotation))
```

Or:

```js
await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
```

### Events

The following events are emitted to inform you of the state of the WarpedMapLayer:

| Description                                                   | Type                      | Data                               |
| ------------------------------------------------------------- | ------------------------- | ---------------------------------- |
| A warped map has been added to the warped map list            | `warpedmapadded`          | `mapId: string`                    |
| A warped map has been removed from the warped map list        | `warpedmapremoved`        | `mapId: string`                    |
| A warped map enters the viewport                              | `warpedmapenter`          | `mapId: string`                    |
| A warped map leaves the viewport                              | `warpedmapleave`          | `mapId: string`                    |
| The visibility of some warpedMaps has changed                 | `visibilitychanged`       | `mapIds: string[]`                 |
| The cache loaded a first tile of a map                        | `firstmaptileloaded`      | `{mapId: string, tileUrl: string}` |
| All tiles requested for the current viewport have been loaded | `allrequestedtilesloaded` |                                    |

You can listen to them in the typical OpenLayers way. Here's an example:

```js
warpedMapLayer.on('warpedmapadded', (event) => {
  console.log(event.mapId, warpedMapLayer.getExtent())
})
```

### What is a *map*?

An OpenLayers map is an instance of the OpenLayers [`Map`](https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html) class, the central class of the OpenLayers API, used to create a map on a page and manipulate it.

In Allmaps there are multiple classes describing maps, one for each phase a map takes through the Allmaps rendering pipeline:

* When a Georeference Annotation is parsed, an instance of the Georeferenced Map class is created from it.
* When this map is loaded into an application for rendering, an instance of the Warped Map class is created from it.
* Inside the WebGL2 rendering package, the `WebGL2WarpedMap` class is used to render the map.

All these map phases originating from the same Georeference Annotation have the same unique `mapId` property. This string value is used thoughout Allmaps (and in the API below) to identify a map. It is returned after adding a Georeference Annotation to a warpedMapLayer, so you can use it later to call functions on a specific map.

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

### `new WarpedMapLayer(options)`

Creates a WarpedMapLayer instance

###### Parameters

* `options?` (`Partial<WebGL2RendererOptions> | undefined`)
  * the WebGL2 renderer options

###### Returns

`WarpedMapLayer`.

###### Extends

* `Layer`

### `WarpedMapLayer#addEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#addGeoreferenceAnnotation(annotation)`

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation

###### Returns

`Promise<Array<string | Error>>`.

* the map IDs of the maps that were added, or an error per map

### `WarpedMapLayer#addGeoreferenceAnnotationByUrl(annotationUrl)`

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

###### Parameters

* `annotationUrl` (`string`)
  * Georeference Annotation

###### Returns

`Promise<Array<string | Error>>`.

* the map IDs of the maps that were added, or an error per map

### `WarpedMapLayer#addGeoreferencedMap(georeferencedMap)`

Adds a Georeferenced map.

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced map

###### Returns

`Promise<string | Error>`.

* the map ID of the map that was added, or an error

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

Clears: removes all maps

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#container`

###### Type

```ts
HTMLElement
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

### `WarpedMapLayer#dispose()`

Disposes all WebGL resources and cached tiles

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#getCanvas()`

Gets the HTML canvas element of the layer

###### Parameters

There are no parameters.

###### Returns

HTML Canvas element (`HTMLCanvasElement | null`).

### `WarpedMapLayer#getContainer()`

Gets the HTML container element of the layer

###### Parameters

There are no parameters.

###### Returns

HTML element (`HTMLElement`).

### `WarpedMapLayer#getExtent()`

Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in projected coordinates.

###### Parameters

There are no parameters.

###### Returns

`Extent | undefined`.

* bounding box of all warped maps

### `WarpedMapLayer#getLonLatExtent()`

Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.

###### Parameters

There are no parameters.

###### Returns

`Extent | undefined`.

* Bounding box of all warped maps

### `WarpedMapLayer#getMapOpacity(mapId)`

Gets the opacity of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

Opacity of the map (`number | undefined`).

### `WarpedMapLayer#getMapZIndex(mapId)`

Returns the z-index of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the warped map

###### Returns

`number | undefined`.

* z-index of the warped map

### `WarpedMapLayer#getWarpedMap(mapId)`

Returns a single map's warped map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

the warped map (`WebGL2WarpedMap | undefined`).

### `WarpedMapLayer#getWarpedMapList()`

Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps

###### Parameters

There are no parameters.

###### Returns

the warped map list (`WarpedMapList<WebGL2WarpedMap>`).

### `WarpedMapLayer#gl`

###### Type

```ts
WebGL2RenderingContext
```

### `WarpedMapLayer#hideMap(mapId)`

Make a single map invisible

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WarpedMapLayer#hideMaps(mapIds)`

Make multiple maps invisible

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#isMapVisible(mapId)`

Returns the visibility of a single map

###### Parameters

* `mapId` (`string`)

###### Returns

`boolean | undefined`.

* whether the map is visible

### `WarpedMapLayer#passWarpedMapEvent(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#removeEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#removeGeoreferenceAnnotation(annotation)`

Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation

###### Returns

`Promise<Array<string | Error>>`.

* the map IDs of the maps that were removed, or an error per map

### `WarpedMapLayer#removeGeoreferenceAnnotationByUrl(annotationUrl)`

Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

###### Parameters

* `annotationUrl` (`string`)
  * Georeference Annotation

###### Returns

`Promise<Array<string | Error>>`.

* the map IDs of the maps that were removed, or an error per map

### `WarpedMapLayer#removeGeoreferencedMap(georeferencedMap)`

Removes a Georeferenced map.

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced map

###### Returns

`Promise<string | Error>`.

* the map ID of the map that was remvoed, or an error

### `WarpedMapLayer#removeGeoreferencedMapById(mapId)`

###### Parameters

* `mapId` (`string`)

###### Returns

`void`.

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

### `WarpedMapLayer#resetColorize()`

Resets the colorization for all maps

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#resetGrid()`

Resets the grid for all maps

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#resetMapColorize(mapId)`

Resets the colorization of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetMapGrid(mapId)`

Resets the grid of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetMapOpacity(mapId)`

Resets the opacity of a single map to fully opaque

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetMapRemoveColor(mapId)`

Resets the color for a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetMapSaturation(mapId)`

Resets the saturation of a single map to the original colors

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetRemoveColor()`

Resets the color removal for all maps

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#resetSaturation()`

Resets the saturation of a single map to the original colors

###### Parameters

There are no parameters.

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

### `WarpedMapLayer#setColorize(hexColor)`

Sets the colorization for all maps

###### Parameters

* `hexColor` (`string`)
  * desired hex color

###### Returns

`void`.

### `WarpedMapLayer#setGrid(enabled)`

Sets the grid for all maps

###### Parameters

* `enabled` (`boolean`)
  * whether to show the grid

###### Returns

`void`.

### `WarpedMapLayer#setImageInformations(imageInformations)`

Sets the object that caches image information

###### Parameters

* `imageInformations` (`Map<string, unknown>`)
  * Object that caches image information

###### Returns

`void`.

### `WarpedMapLayer#setMapColorize(mapId, hexColor)`

Sets the colorization for a single mapID of the map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `hexColor` (`string`)
  * desired hex color

###### Returns

`void`.

### `WarpedMapLayer#setMapGcps(mapId, gcps)`

Sets the GCOs of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `gcps` (`Array<Gcp>`)

###### Returns

`void`.

### `WarpedMapLayer#setMapGrid(mapId, enabled)`

Sets the grid for a single mapID of the map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `enabled` (`boolean`)
  * whether to show the grid

###### Returns

`void`.

### `WarpedMapLayer#setMapOpacity(mapId, opacity)`

Sets the opacity of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `opacity` (`number`)
  * opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque

###### Returns

`void`.

### `WarpedMapLayer#setMapRemoveColor(mapId, options)`

Removes a color from a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `options` (`{
    hexColor?: string | undefined
    threshold?: number | undefined
    hardness?: number | undefined
  }`)

###### Returns

`void`.

### `WarpedMapLayer#setMapResourceMask(mapId, resourceMask)`

Sets the resource mask of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `resourceMask` (`Array<Point>`)
  * new resource mask

###### Returns

`void`.

### `WarpedMapLayer#setMapSaturation(mapId, saturation)`

Sets the saturation of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `saturation` (`number`)
  * saturation between 0 and 1, where 0 is grayscale and 1 are the original colors

###### Returns

`void`.

### `WarpedMapLayer#setMapTransformationType(mapId, transformation)`

Sets the transformation type of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map
* `transformation` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)
  * new transformation type

###### Returns

`void`.

### `WarpedMapLayer#setMapsDistortionMeasure(mapIds, distortionMeasure)`

Sets the distortion measure of multiple maps

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps
* `distortionMeasure?` (`DistortionMeasure | undefined`)
  * new distortion measure

###### Returns

`void`.

### `WarpedMapLayer#setMapsTransformationType(mapIds, transformation)`

Sets the transformation type of multiple maps

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps
* `transformation` (`  | 'straight'
    | 'helmert'
    | 'polynomial'
    | 'polynomial1'
    | 'polynomial2'
    | 'polynomial3'
    | 'thinPlateSpline'
    | 'projective'
    | 'linear'`)
  * new transformation type

###### Returns

`void`.

### `WarpedMapLayer#setOptions(options)`

Sets the options

###### Parameters

* `options?` (`Partial<WebGL2RendererOptions> | undefined`)
  * Options

###### Returns

`void`.

### `WarpedMapLayer#setRemoveColor(options)`

Removes a color from all maps

###### Parameters

* `options` (`{
    hexColor?: string | undefined
    threshold?: number | undefined
    hardness?: number | undefined
  }`)

###### Returns

`void`.

### `WarpedMapLayer#setSaturation(saturation)`

Sets the saturation of a single map

###### Parameters

* `saturation` (`number`)
  * saturation between 0 and 1, where 0 is grayscale and 1 are the original colors

###### Returns

`void`.

### `WarpedMapLayer#showMap(mapId)`

Make a single map visible

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

`void`.

### `WarpedMapLayer#showMaps(mapIds)`

Make multiple maps visible

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.
