# @allmaps/leaflet

Allmaps plugin for [Leaflet](https://leafletjs.com/). This plugin allows displaying georeferenced [IIIF images](https://iiif.io/) on a Leaflet map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and uses WebGL to transform images from a IIIF image server to overlay them on their correct geographical position. See [allmaps.org](https://allmaps.org) for more information.

_The development of the Allmaps plugin for Leaflet was funded by [CLARIAH-VL](https://clariahvl.hypotheses.org/)._

<!-- TODO: replace with relative URL, but make sure this does not break docs.allmaps.org -->

<!-- Or put these images on static.allmaps.org -->

[![Example of the Allmaps plugin for Leaflet](https://raw.githubusercontent.com/allmaps/allmaps/main/packages/leaflet/example.jpg)](https://observablehq.com/@allmaps/leaflet-plugin)

Examples:

- [Observable notebook](https://observablehq.com/@allmaps/leaflet-plugin)

## How it works

This plugin exports the class `WarpedMapLayer` that extends [`L.Layer`](https://leafletjs.com/reference.html#layer). You can add one or multiple Georeference Annotations (or AnnotationPages that contain multiple Georeference Annotations) to a WarpedMapLayer, and add the WarpedMapLayer to your Leaflet map. This will render all georeferenced maps defined by the Georeference Annotations.

To understand what happens under the hood for each georeferenced map, see the [@allmaps/render](../render/README.md) package.

## Installation

This package works in browsers and in Node.js as an ESM or an UMD module.

Install with pnpm:

```sh
npm install @allmaps/leaflet
```

You can optionally build this package locally by running:

```sh
pnpm run build
```

## Usage

Built for Leaflet 1.9, but should work with earlier versions as well.

### Loading a Georeference Annotation

Creating a `WarpedMapLayer` and adding it to a map looks like this:

```js
import { WarpedMapLayer } from '@allmaps/leaflet'

const map = L.map('map', {
  center: [51.0518, 3.7278],
  zoom: 14,
  // Zoom animations for more than one zoom level are
  // currently not supported by the Allmaps plugin for Leaflet
  zoomAnimationThreshold: 1
})
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

const annotationUrl =
  'https://annotations.allmaps.org/manifests/8f9faeba73d67031'
const warpedMapLayer = new WarpedMapLayer(annotationUrl).addTo(map)
```

When adding this WarpedMapLayer to the Leaflet map, the georeferenced map specified in the Georeference Annotation will be rendered on the Leaflet map.

Specifying a the URL Georeference Annotation when creating a WarpedMapLayer (as is done above) is optional. A Georeference Annotation can also be added at a later stage using the `addGeoreferenceAnnotation` and `addGeoreferenceAnnotationByUrl` functions:

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

The following events are emitted to inform you of the state of the WarpedMapLayer.

| Description                                                   | Type                      | Data                               |
| ------------------------------------------------------------- | ------------------------- | ---------------------------------- |
| A warped map has been added to the warped map list            | `warpedmapadded`          | `mapId: string`                    |
| A warped map has been removed from the warped map list        | `warpedmapremoved`        | `mapId: string`                    |
| A warped map enters the viewport                              | `warpedmapenter`          | `mapId: string`                    |
| A warped map leaves the viewport                              | `warpedmapleave`          | `mapId: string`                    |
| The visibility of some warped maps has changed                | `visibilitychanged`       | `mapIds: string[]`                 |
| The cache loaded a first tile of a map                        | `firstmaptileloaded`      | `{mapId: string, tileUrl: string}` |
| All tiles requested for the current viewport have been loaded | `allrequestedtilesloaded` |                                    |

You can listen to them in the typical Leaflet way. Here's an example:

```js
map.on('warpedmapadded', (event) => {
  console.log(event.mapId, WarpedMapLayer.getBounds())
})
```

Some of the functions specified in the API only make sense once a warped map is loaded into the `WarpedMapLayer`. You can use such listeners to make sure function are run e.g. only after a warped map has been added.

### What is a _map_?

A Leaflet map is an instance of the Leaflet [`Map`](https://leafletjs.com/reference.html#map) class, the central class of the Leaflet API, used to create a map on a page and manipulate it.

In Allmaps there are multiple classes describing maps, one for each phase a map takes through the Allmaps rendering pipeline:

- When a Georeference Annotation is parsed, an instance of the `GeoreferencedMap` class is created from it.
- When this map is loaded into an application for rendering, an instance of the `WarpedMap` class is created from it.
- Inside the WebGL2 rendering package, the `WebGL2WarpedMap` class is used to render the map.

All these map phases originate from the same Georeference Annotation have the same unique `mapId` property. This string value is used thoughout Allmaps (and in the API below) to identify a map. It is returned after adding a georeference annotation to a WarpedMapLayer, so you can use it later to call functions on a specific map.

## License

MIT

## API

### `LeafletWarpedMapLayerOptions`

###### Type

```ts
{ renderMaps: boolean; renderLines: boolean; renderPoints: boolean; debugMaps: boolean; } & SpecificWebGL2WarpedMapOptions & WarpedMapOptions & { ...; } & { ...; }
```

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

### `new WarpedMapLayer(annotationOrAnnotationUrl, options)`

Creates a WarpedMapLayer

###### Parameters

- `annotationOrAnnotationUrl` (`unknown`)
  - Georeference Annotation or URL of a Georeference Annotation
- `options?` (`Partial<LeafletWarpedMapLayerOptions> | undefined`)
  - Options for the layer

###### Returns

`WarpedMapLayer`.

### `WarpedMapLayer#_addEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#_animateZoom(e)`

###### Parameters

- `e` (`L.ZoomAnimEvent`)

###### Returns

`void`.

### `WarpedMapLayer#_annotationOrAnnotationUrl`

###### Type

```ts
unknown
```

### `WarpedMapLayer#_contextLost(event)`

###### Parameters

- `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#_contextRestored(event)`

###### Parameters

- `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#_initGl()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#_passWarpedMapEvent(event)`

###### Parameters

- `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#_removeEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#_resized(entries)`

###### Parameters

- `entries` (`Array<ResizeObserverEntry>`)

###### Returns

`void`.

### `WarpedMapLayer#_unload()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#_update()`

###### Parameters

There are no parameters.

###### Returns

`HTMLDivElement | undefined`.

### `WarpedMapLayer#_updateZIndex()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#addGeoreferenceAnnotation(annotation)`

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).

###### Parameters

- `annotation` (`unknown`)
  - Georeference Annotation

###### Returns

`Promise<Array<string | Error>>`.

- the map IDs of the maps that were added, or an error per map

### `WarpedMapLayer#addGeoreferenceAnnotationByUrl(annotationUrl)`

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

###### Parameters

- `annotationUrl` (`string`)
  - Georeference Annotation

###### Returns

The map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferencedMap(georeferencedMap)`

Adds a Georeferenced map.

###### Parameters

- `georeferencedMap` (`unknown`)
  - Georeferenced map

###### Returns

The map ID of the map that was added, or an error (`Promise<string | Error>`).

### `WarpedMapLayer#bringMapsForward(mapIds)`

Bring maps forward

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#bringMapsToFront(mapIds)`

Bring maps to front

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#bringToBack()`

Brings the layer to the back of other overlays (in the same map pane).

###### Parameters

There are no parameters.

###### Returns

`this`.

### `WarpedMapLayer#bringToFront()`

Brings the layer in front of other overlays (in the same map pane).

###### Parameters

There are no parameters.

###### Returns

`this`.

### `WarpedMapLayer#canvas`

###### Type

```ts
HTMLCanvasElement | undefined
```

### `WarpedMapLayer#clear()`

Removes all warped maps from the layer

###### Parameters

There are no parameters.

###### Returns

`this`.

### `WarpedMapLayer#container`

###### Type

```ts
HTMLDivElement | undefined
```

### `WarpedMapLayer#getBounds()`

Returns the bounds of all visible maps (inside or outside of the Viewport), in latitude/longitude coordinates.

###### Parameters

There are no parameters.

###### Returns

`Array<Array<number>> | undefined`.

- L.LatLngBounds in array form of all visible maps

### `WarpedMapLayer#getCanvas()`

Gets the HTML canvas element of the layer

###### Parameters

There are no parameters.

###### Returns

HTML Canvas Element (`HTMLCanvasElement | undefined`).

### `WarpedMapLayer#getContainer()`

Gets the HTML container element of the layer

###### Parameters

There are no parameters.

###### Returns

HTML Div Element (`HTMLDivElement | undefined`).

### `WarpedMapLayer#getMapOpacity(mapId)`

Gets the opacity of a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

opacity of the map (`number | undefined`).

### `WarpedMapLayer#getMapZIndex(mapId)`

Returns the z-index of a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`number | undefined`.

- z-index of the map

### `WarpedMapLayer#getOpacity()`

Gets the opacity of the layer

###### Parameters

There are no parameters.

###### Returns

Layer opacity (`number`).

### `WarpedMapLayer#getPaneName()`

Gets the pane name the layer is attached to. Defaults to 'tilePane'

###### Parameters

There are no parameters.

###### Returns

Pane name (`string`).

### `WarpedMapLayer#getWarpedMap(mapId)`

Returns a single map's warped map

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

the warped map (`WebGL2WarpedMap | undefined`).

### `WarpedMapLayer#getWarpedMapList()`

Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps

###### Parameters

There are no parameters.

###### Returns

`WarpedMapList<WebGL2WarpedMap>`.

### `WarpedMapLayer#getZIndex()`

Gets the z-index of the layer.

###### Parameters

There are no parameters.

###### Returns

`number | undefined`.

### `WarpedMapLayer#gl`

###### Type

```ts
;WebGL2RenderingContext | null | undefined
```

### `WarpedMapLayer#hideMap(mapId)`

Make a single map invisible

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`void`.

### `WarpedMapLayer#hideMaps(mapIds)`

Make multiple maps invisible

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#initialize(annotationOrAnnotationUrl, options)`

###### Parameters

- `annotationOrAnnotationUrl` (`unknown`)
- `options?` (`Partial<LeafletWarpedMapLayerOptions> | undefined`)

###### Returns

`void`.

### `WarpedMapLayer#isMapVisible(mapId)`

Returns the visibility of a single map

###### Parameters

- `mapId` (`string`)

###### Returns

`boolean | undefined`.

- whether the map is visible

### `WarpedMapLayer#onAdd(map)`

Contains all code code that creates DOM elements for the layer and adds them to map panes where they belong.

###### Parameters

- `map` (`L.Map`)

###### Returns

`this`.

### `WarpedMapLayer#onRemove(map)`

Contains all cleanup code that removes the layer's elements from the DOM.

###### Parameters

- `map` (`L.Map`)

###### Returns

`this`.

### `WarpedMapLayer#options`

###### Fields

- `className` (`string`)
- `interactive` (`false`)
- `opacity` (`number`)
- `pane` (`string`)
- `zIndex` (`number`)

### `WarpedMapLayer#removeGeoreferenceAnnotation(annotation)`

Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).

###### Parameters

- `annotation` (`unknown`)
  - Georeference Annotation

###### Returns

`Promise<Array<string | Error>>`.

- the map IDs of the maps that were removed, or an error per map

### `WarpedMapLayer#removeGeoreferenceAnnotationByUrl(annotationUrl)`

Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

###### Parameters

- `annotationUrl` (`string`)
  - Georeference Annotation

###### Returns

The map IDs of the maps that were removed, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#removeGeoreferencedMap(georeferencedMap)`

Removes a Georeferenced map.

###### Parameters

- `georeferencedMap` (`unknown`)
  - Georeferenced map

###### Returns

The map ID of the map that was removed, or an error (`Promise<string | Error>`).

### `WarpedMapLayer#renderer`

###### Type

```ts
WebGL2Renderer | undefined
```

### `WarpedMapLayer#resetColorize()`

Resets the colorization for all maps

###### Parameters

There are no parameters.

###### Returns

`this`.

### `WarpedMapLayer#resetMapColorize(mapId)`

Resets the colorization of a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`this`.

### `WarpedMapLayer#resetMapOpacity(mapId)`

Resets the opacity of a single map to 1

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`this`.

### `WarpedMapLayer#resetMapRemoveColor(mapId)`

Resets the color removal for a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`this`.

### `WarpedMapLayer#resetMapSaturation(mapId)`

Resets the saturation of a single map to the original colors

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`this`.

### `WarpedMapLayer#resetOpacity()`

Resets the opacity of the layer to fully opaque

###### Parameters

There are no parameters.

###### Returns

`this`.

### `WarpedMapLayer#resetRemoveColor()`

Resets the color removal for all maps

###### Parameters

There are no parameters.

###### Returns

`this`.

### `WarpedMapLayer#resetSaturation()`

Resets the saturation of a single map to the original colors

###### Parameters

There are no parameters.

###### Returns

`this`.

### `WarpedMapLayer#resizeObserver`

###### Type

```ts
ResizeObserver | undefined
```

### `WarpedMapLayer#sendMapsBackward(mapIds)`

Send maps backward

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#sendMapsToBack(mapIds)`

Send maps to back

###### Parameters

- `mapIds` (`Array<string>`)
  - IDs of the maps

###### Returns

`void`.

### `WarpedMapLayer#setColorize(hexColor)`

Sets the colorization for all maps

###### Parameters

- `hexColor` (`string`)
  - desired hex color

###### Returns

`this`.

### `WarpedMapLayer#setImageInformations(imageInformations)`

Sets the object that caches image information

###### Parameters

- `imageInformations` (`Map<string, unknown>`)
  - Object that caches image information

###### Returns

`void`.

### `WarpedMapLayer#setMapColorize(mapId, hexColor)`

Sets the colorization for a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map
- `hexColor` (`string`)
  - desired hex color

###### Returns

`this`.

### `WarpedMapLayer#setMapOpacity(mapId, opacity)`

Sets the opacity of a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map
- `opacity` (`number`)
  - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque

###### Returns

`this`.

### `WarpedMapLayer#setMapRemoveColor(mapId, options)`

Removes a color from a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map
- `options` (`{
  hexColor?: string | undefined
  threshold?: number | undefined
  hardness?: number | undefined
}`)
  - remove color options

###### Returns

`this`.

### `WarpedMapLayer#setMapResourceMask(mapId, resourceMask)`

Sets the resource mask of a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map
- `resourceMask` (`Array<Point>`)
  - new resource mask

###### Returns

`void`.

### `WarpedMapLayer#setMapSaturation(mapId, saturation)`

Sets the saturation of a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map
- `saturation` (`number`)
  - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors

###### Returns

`this`.

### `WarpedMapLayer#setMapsDistortionMeasure(mapIds, distortionMeasure)`

Sets the distortion measure of multiple maps

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps
- `distortionMeasure?` (`DistortionMeasure | undefined`)
  - new transformation type

###### Returns

`void`.

### `WarpedMapLayer#setMapsTransformationType(mapIds, transformation)`

Sets the transformation type of multiple maps

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps
- `transformation` (`  | 'straight'
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'thinPlateSpline'
  | 'projective'
  | 'linear'`)
  - new transformation type

###### Returns

`void`.

### `WarpedMapLayer#setOpacity(opacity)`

Sets the opacity of the layer

###### Parameters

- `opacity` (`number`)
  - Layer opacity

###### Returns

`this`.

### `WarpedMapLayer#setOptions(options)`

Sets the options

###### Parameters

- `options?` (`Partial<LeafletWarpedMapLayerOptions> | undefined`)
  - Options

###### Returns

`void`.

### `WarpedMapLayer#setRemoveColor(options)`

Removes a color from all maps

###### Parameters

- `options` (`{
  hexColor?: string | undefined
  threshold?: number | undefined
  hardness?: number | undefined
}`)
  - remove color options

###### Returns

`this`.

### `WarpedMapLayer#setSaturation(saturation)`

Sets the saturation of a single map

###### Parameters

- `saturation` (`number`)
  - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors

###### Returns

`this`.

### `WarpedMapLayer#setZIndex(value)`

Changes the z-index of the layer.

###### Parameters

- `value` (`number`)
  - z-index

###### Returns

`this`.

### `WarpedMapLayer#showMap(mapId)`

Make a single map visible

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`void`.

### `WarpedMapLayer#showMaps(mapIds)`

Make multiple maps visible

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps

###### Returns

`void`.
