# @allmaps/maplibre

Allmaps plugin for [MapLibre GL](https://maplibre.org/). This plugin allows displaying georeferenced [IIIF images](https://iiif.io/) on a MapLibre map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and uses WebGL to transform images from a IIIF image server to overlay them on their correct geographical position. See [allmaps.org](https://allmaps.org) for more information.

[![Example of the Allmaps plugin for MapLibre](https://raw.githubusercontent.com/allmaps/allmaps/main/packages/maplibre/example.jpg)](https://observablehq.com/@allmaps/maplibre-plugin)

Examples:

* [Observable notebook](https://observablehq.com/@allmaps/maplibre-plugin)
* [HTML example using ESM and Skypack](https://allmaps.org/allmaps/packages/maplibre/examples/skypack.html)
* [HTML example using UMD and jsDelivr](https://allmaps.org/allmaps/packages/maplibre/examples/jsdelivr.html)

## How it works

This plugin creates a new class `WarpedMapLayer` which extends MapLibre's [`CustomLayerInterface`](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/). You can add one or multiple Georeference Annotations (or AnnotationPages with multiple Georeference Annotations) to a WarpedMapLayer, and add the WarpedMapLayer to your MapLibre map. This will render all georeferenced maps contained in the Georeference Annotation on your MapLibre map.

To understand what happens under the hood for each georeferenced map, see the [@allmaps/render](../render/README.md) package.

## Installation

This package works in browsers and in Node.js as an ESM or an UMD module.

Install with pnpm:

```sh
pnpm install @allmaps/maplibre
```

You can optionally build this package locally by running:

```sh
pnpm run build
```

As an alternative to loading using import, ESM and UMD bundled versions of the code are also provided under `/dist/bundled` (once the code is built). These are also published online, so can load them directly in a HTML script tag using a CDN.

```html
<script src="https://cdn.jsdelivr.net/npm/@allmaps/maplibre/dist/bundled/allmaps-maplibre-4.0.umd.js"></script>
```

When loading the bundled package, its classes are available under the `Allmaps` global variable:

```js
const warpedMapLayer = new Allmaps.WarpedMapLayer()
```

## Usage

Built for MapLibre 4.0, but should work with earlier versions as well.

### Loading a Georeference Annotation

Creating a `WarpedMapLayer` and adding it to a map looks like this:

```js
import { WarpedMapLayer } from '@allmaps/maplibre'

// MapLibre map with base layer
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  center: [-73.9337, 40.8011],
  zoom: 11.5,
  // Pitch is currently not supported by the Allmaps plugin for MapLibre
  maxPitch: 0
})

const annotationUrl = 'https://annotations.allmaps.org/images/d180902cb93d5bf2'
const warpedMapLayer = new WarpedMapLayer()

map.on('load', () => {
  map.addLayer(warpedMapLayer)
  warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
})
```

WarpedMapLayer is implemented using MapLibre's [CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/). It can be added to a map like any other MapLibre layer, but there are some things to take into account:

* `WarpedMapLayer` does not make use of a [Source](https://maplibre.org/maplibre-style-spec/sources/) (although that could be implemented in the future, similar to [@allmaps/openlayers](../openlayers)).
* `WarpedMapLayer` currently does not support pitch, so disable it on your map.
* Just like other MapLibre layers, a WarpedMapLayer must have a unique `id`. By default, the `id` has the value `warped-map-layer`. When adding multiple WarpedMapLayers to your map, pass a unique `id` to their constructor:

```js
const warpedMapLayerWithUniqueId = new WarpedMapLayer('my-unique-id')
```

A Georeference Annotation can be added to a `WarpedMapLayer` using the `addGeoreferenceAnnotation` and `addGeoreferenceAnnotationByUrl` functions:

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

The following events are emitted to inform you of the state of the `WarpedMapLayer`.

| Description                                                   | Type                      | Data                               |
| ------------------------------------------------------------- | ------------------------- | ---------------------------------- |
| A warped map has been added to the warped map list            | `warpedmapadded`          | `mapId: string`                    |
| A warped map has been removed from the warped map list        | `warpedmapremoved`        | `mapId: string`                    |
| A warped map enters the viewport                              | `warpedmapenter`          | `mapId: string`                    |
| A warped map leaves the viewport                              | `warpedmapleave`          | `mapId: string`                    |
| The visibility of some warpedMaps has changed                 | `visibilitychanged`       | `mapIds: string[]`                 |
| The cache loaded a first tile of a map                        | `firstmaptileloaded`      | `{mapId: string, tileUrl: string}` |
| All tiles requested for the current viewport have been loaded | `allrequestedtilesloaded` |                                    |

You can listen to them in the typical MapLibre way. Here's an example:

```js
warpedMapLayer.on('warpedmapadded', (event) => {
  console.log(event.mapId, warpedMapLayer.getBounds())
})
```

Some of the functions specified in the API only make sense once a warped map is loaded into the WarpedMapLayer. You can use such listeners to make sure function are run e.g. only after a warped map has been added.

### What is a *map*?

A MapLibre map is an instance of the MapLibre [`Map`](https://maplibre.org/maplibre-gl-js/docs/API/classes/maplibregl.Map/) class, the central class of the MapLibre API, used to create a map on a page and manipulate it.

In Allmaps there are multiple classes describing maps, one for each phase a map takes through the Allmaps rendering pipeline:

* When a Georeference Annotation is parsed, an instance of the Georeferenced Map class is created from it.
* When this map is loaded into an application for rendering, an instance of the Warped Map class is created from it.
* Inside the WebGL2 rendering package, the `WebGL2WarpedMap` class is used to render the map.

All these map phases originating from the same Georeference Annotation have the same unique `mapId` property. This string value is used though-out Allmaps (and in the API below) to identify a map. It is returned after adding a georeference annotation to a warpedMapLayer, so you can use it later to call functions on a specific map.

## License

MIT

## API

### `MapLibreWarpedMapLayerOptions`

###### Type

```ts
{ renderMaps: boolean; renderLines: boolean; renderPoints: boolean; debugMaps: boolean; } & SpecificWebGL2WarpedMapOptions & WarpedMapOptions & { ...; }
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

### `new WarpedMapLayer(id, options)`

Creates a WarpedMapLayer instance

###### Parameters

* `id?` (`string | undefined`)
  * Unique ID for this layer
* `options?` (`Partial<WebGL2RendererOptions> | undefined`)
  * options

###### Returns

`WarpedMapLayer`.

###### Extends

* `CustomLayerInterface`

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

the map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferenceAnnotationByUrl(annotationUrl)`

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

###### Parameters

* `annotationUrl` (`string`)
  * Georeference Annotation

###### Returns

the map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

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

### `WarpedMapLayer#clear()`

Removes all warped maps from the layer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#contextLost()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#contextRestored()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#getBounds()`

Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.

###### Parameters

There are no parameters.

###### Returns

`LngLatBoundsLike | undefined`.

* bounding box of all warped maps

### `WarpedMapLayer#getMapOpacity(mapId)`

Gets the opacity of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the map

###### Returns

opacity of the map (`number | undefined`).

### `WarpedMapLayer#getMapZIndex(mapId)`

Returns the z-index of a single map

###### Parameters

* `mapId` (`string`)
  * ID of the warped map

###### Returns

`number | undefined`.

* z-index of the warped map

### `WarpedMapLayer#getOpacity()`

Gets the opacity of the layer

###### Parameters

There are no parameters.

###### Returns

opacity of the map (`number | undefined`).

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

### `WarpedMapLayer#id`

###### Type

```ts
'warped-map-layer'
```

### `WarpedMapLayer#isMapVisible(mapId)`

Returns the visibility of a single map

###### Parameters

* `mapId` (`string`)

###### Returns

`boolean | undefined`.

* whether the map is visible

### `WarpedMapLayer#map?`

###### Type

```ts
Map
```

### `WarpedMapLayer#onAdd(map, gl)`

Method called when the layer has been added to the Map.

###### Parameters

* `map` (`Map`)
  * The Map this custom layer was just added to.
* `gl` (`WebGL2RenderingContext`)
  * The WebGL 2 context for the map.

###### Returns

`void`.

### `WarpedMapLayer#onRemove()`

Method called when the layer has been removed from the Map.

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#options?`

###### Type

```ts
{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; debugMaps?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsSize?: number | undefined; ... 30 more ...; createRTree?: boolean | undefined; }
```

### `WarpedMapLayer#passWarpedMapEvent(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#preparerender()`

Prepare rendering the layer.

###### Parameters

There are no parameters.

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

the map IDs of the maps that were removed, or an error per map (`Promise<Array<string | Error>>`).

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

### `WarpedMapLayer#render()`

Render the layer.

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#renderer?`

###### Type

```ts
WebGL2Renderer
```

### `WarpedMapLayer#renderingMode`

###### Type

```ts
'2d'
```

### `WarpedMapLayer#resetColorize()`

Resets the colorization for all maps

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

### `WarpedMapLayer#resetOpacity()`

Resets the opacity of the layer to fully opaque

###### Parameters

There are no parameters.

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

### `WarpedMapLayer#setImageInformations(imageInformations)`

Sets the object that caches image information

###### Parameters

* `imageInformations` (`globalThis.Map<string, unknown>`)
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
  * remove color options

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

### `WarpedMapLayer#setMapsDistortionMeasure(mapIds, distortionMeasure)`

Sets the distortion measure of multiple maps

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps
* `distortionMeasure?` (`DistortionMeasure | undefined`)
  * new transformation type

###### Returns

`void`.

### `WarpedMapLayer#setMapsInternalProjection(mapIds, internalProjection)`

Sets the internal projection of multiple maps

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps
* `internalProjection` (`{name?: string; definition: ProjectionDefinition}`)
  * new internal projection

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

### `WarpedMapLayer#setOpacity(opacity)`

Sets the opacity of the layer

###### Parameters

* `opacity` (`number`)
  * opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque

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
  * remove color options

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

### `WarpedMapLayer#triggerRepaint()`

Trigger repaint.

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#type`

###### Type

```ts
'custom'
```
