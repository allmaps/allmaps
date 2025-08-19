# @allmaps/maplibre

Allmaps plugin for [MapLibre GL](https://maplibre.org/). This plugin allows displaying georeferenced [IIIF images](https://iiif.io/) on a MapLibre map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and uses WebGL to transform images from a IIIF image server to overlay them on their correct geographical position. See [allmaps.org](https://allmaps.org) for more information.

[![Example of the Allmaps plugin for MapLibre](https://raw.githubusercontent.com/allmaps/allmaps/main/packages/maplibre/example.jpg)](https://observablehq.com/@allmaps/maplibre-plugin)

Examples:

* [Observable notebook](https://observablehq.com/@allmaps/maplibre-plugin)

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
const warpedMapLayerWithUniqueId = new WarpedMapLayer({layerId: 'my-unique-id'})
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

### WarpedMapLayer API and Events

See the [@allmaps/warpedmaplayer](../warpedmaplayer/README.md) package for the API documentation of the methods inherited from the WarpedMapLayer class (shared by all Allmaps plugins) and a list of events emitted by a WarpedMapLayer.

You can listen to them in the typical MapLibre way. Here's an example:

```js
warpedMapLayer.on('warpedmapadded', (event) => {
  console.log(event.mapIds, warpedMapLayer.getBounds())
})
```

## License

MIT

## API

### `MapLibreWarpedMapLayerOptions`

###### Type

```ts
SpecificMapLibreWarpedMapLayerOptions & Partial<WebGL2RenderOptions>
```

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
}
```

### `new WarpedMapLayer(options)`

Creates a WarpedMapLayer instance

###### Parameters

* `options?` (`Partial<MapLibreWarpedMapLayerOptions> | undefined`)
  * options

###### Returns

`WarpedMapLayer`.

###### Extends

* `BaseWarpedMapLayer`
* `CustomLayerInterface`

### `WarpedMapLayer#getBounds()`

Get the bounding box of all maps  as a MapLibre LngLatBoundsLike object

This is the default MapLibre getBounds() function

Result is in longitude/latitude `EPSG:4326` coordinates.

###### Parameters

There are no parameters.

###### Returns

bounding box of all warped maps (`LngLatBoundsLike | undefined`).

### `WarpedMapLayer#id`

###### Type

```ts
string
```

### `WarpedMapLayer#map?`

###### Type

```ts
MaplibreMap
```

### `WarpedMapLayer#nativePassWarpedMapEvent(event)`

Pass events

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `WarpedMapLayer#nativeUpdate()`

Trigger the native update function of the map

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#onAdd(map, gl)`

Method called when the layer has been added to the Map.

###### Parameters

* `map` (`MaplibreMap`)
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

### `WarpedMapLayer#render()`

Render the layer.

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#renderingMode`

###### Type

```ts
'2d'
```

### `WarpedMapLayer#type`

###### Type

```ts
'custom'
```
