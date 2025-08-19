# @allmaps/openlayers

Allmaps plugin for OpenLayers. Plugin that uses WebGL to show warped IIIF images on an OpenLayers map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/).

Allmaps plugin for [OpenLayers](https://openlayers.org/). This plugin allows displaying georeferenced [IIIF images](https://iiif.io/) on an OpenLayers map. The plugin works by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and uses WebGL to transform images from a IIIF image server to overlay them on their correct geographical position. See [allmaps.org](https://allmaps.org) for more information.

[![Example of the Allmaps plugin for OpenLayers](https://raw.githubusercontent.com/allmaps/allmaps/main/packages/openlayers/example.jpg)](https://observablehq.com/@allmaps/openlayers-plugin)

Examples:

* [Observable notebook](https://observablehq.com/@allmaps/openlayers-plugin)

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

### WarpedMapLayer API and Events

See the [@allmaps/warpedmaplayer](../warpedmaplayer/README.md) package for the API documentation of the methods inherited from the WarpedMapLayer class (shared by all Allmaps plugins) and a list of events emitted by a WarpedMapLayer.

You can listen to them in the typical OpenLayers way. Here's an example:

```js
warpedMapLayer.on('warpedmapadded', (event) => {
  console.log(event.mapIds, warpedMapLayer.getExtent())
})
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
{ createRTree?: boolean | undefined; rtreeUpdatedOptions?: Array<string> | undefined; animatedOptions?: Array<string> | undefined; renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; ... 59 more ...; distortionMeasure?: DistortionMeasure | undefined; }
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

* `options?` (`Partial<Partial<WebGL2RenderOptions>> | undefined`)
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

### `WarpedMapLayer#addGeoreferenceAnnotation(annotation)`

Adds a Georeference Annotation

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation

###### Returns

Map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferenceAnnotationByUrl(annotationUrl)`

Adds a Georeference Annotation by URL

###### Parameters

* `annotationUrl` (`string`)
  * URL of a Georeference Annotation

###### Returns

Map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferencedMap(georeferencedMap)`

Adds a Georeferenced Map

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced Map

###### Returns

Map ID of the map that was added, or an error (`Promise<string | Error>`).

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
{}
```

### `WarpedMapLayer#dispose()`

Disposes all WebGL resources and cached tiles

###### Parameters

There are no parameters.

###### Returns

`void`.

### `WarpedMapLayer#getDefaultMapMergedOptions()`

Get the default map merged options of a specific map ID

###### Parameters

There are no parameters.

###### Returns

`SpecificWebGL2WarpedMapOptions &
  SpecificTriangulatedWarpedMapOptions &
  WarpedMapOptions`.

### `WarpedMapLayer#getLayerOptions()`

Get the layer options

###### Parameters

There are no parameters.

###### Returns

`{ createRTree?: boolean | undefined; rtreeUpdatedOptions?: Array<string> | undefined; animatedOptions?: Array<string> | undefined; renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; ... 59 more ...; distortionMeasure?: DistortionMeasure | undefined; }`.

### `WarpedMapLayer#getLonLatExtent()`

Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.

###### Parameters

There are no parameters.

###### Returns

`Extent | undefined`.

* Bounding box of all warped maps

### `WarpedMapLayer#getMapIds()`

Get mapIds for selected maps

Note: more selection options are available on this function of WarpedMapList

###### Parameters

There are no parameters.

###### Returns

`Array<string>`.

### `WarpedMapLayer#getMapMergedOptions(mapId)`

Get the map merged options of a specific map ID

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`WebGL2WarpedMapOptions | undefined`.

### `WarpedMapLayer#getMapOptions(mapId)`

Get the map options of a specific map ID

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`Partial<WebGL2WarpedMapOptions> | undefined`.

### `WarpedMapLayer#getMapZIndex(mapId)`

Get the z-index of a specific map ID

###### Parameters

* `mapId` (`string`)
  * Map ID for which to get the z-index

###### Returns

The z-index of a specific map ID (`number | undefined`).

### `WarpedMapLayer#getMapsBbox(mapIds, projectionOptions)`

Get the bounding box of the maps

By default the result is returned in the list's projection, which is `EPSG:3857` by default
Use {definition: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Bbox | undefined`).

### `WarpedMapLayer#getMapsCenter(mapIds, projectionOptions)`

Get the center of the bounding box of the maps

By default the result is returned in the list's projection, which is `EPSG:3857` by default
Use {definition: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Point | undefined`).

### `WarpedMapLayer#getMapsConvexHull(mapIds, projectionOptions)`

Get the convex hull of the maps

By default the result is returned in the list's projection, which is `EPSG:3857` by default
Use {definition: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `projectionOptions?` (`ProjectionOptions | undefined`)

###### Returns

The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Ring | undefined`).

### `WarpedMapLayer#getWarpedMap(mapId)`

Get the WarpedMap instance for a specific map

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

* `mapIds` (`Array<string>`)
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
{ createRTree?: boolean | undefined; rtreeUpdatedOptions?: Array<string> | undefined; animatedOptions?: Array<string> | undefined; renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; ... 59 more ...; distortionMeasure?: DistortionMeasure | undefined; }
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

### `WarpedMapLayer#resetLayerOptions(layerOptionKeys, setOptionsOptions)`

Resets the layer options

An empty array resets all options, undefined resets no options.
Doesn't reset render options or specific warped map layer options

###### Parameters

* `layerOptionKeys?` (`Array<string> | undefined`)
  * Keys of the options to reset
* `setOptionsOptions?` (`Partial<SetOptionsOptions> | undefined`)
  * Options when setting the options

###### Returns

`void`.

### `WarpedMapLayer#resetMapsOptions(mapIds, mapOptionKeys, layerOptionKeys, setOptionsOptions)`

Resets the map options of specific map IDs

An empty array resets all options, undefined resets no options.
Doesn't reset render options or specific warped map layer options

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs for which to reset the options
* `mapOptionKeys?` (`Array<string> | undefined`)
  * Keys of the map options to reset
* `layerOptionKeys?` (`Array<string> | undefined`)
  * Keys of the layer options to reset
* `setOptionsOptions?` (`Partial<SetOptionsOptions> | undefined`)
  * Options when setting the options

###### Returns

`void`.

### `WarpedMapLayer#resetMapsOptionsByMapId(mapOptionkeysByMapId, layerOptionKeys, setOptionsOptions)`

Resets the map options of specific maps by map ID

An empty array or map resets all options (for all maps), undefined resets no options.
Doesn't reset render options or specific warped map layer options

###### Parameters

* `mapOptionkeysByMapId` (`Map<string, Array<string>>`)
  * Keys of map options to reset by map ID
* `layerOptionKeys?` (`Array<string> | undefined`)
  * Keys of the layer options to reset
* `setOptionsOptions?` (`Partial<SetOptionsOptions> | undefined`)
  * Options when setting the options

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

### `WarpedMapLayer#setLayerOptions(layerOptions, setOptionsOptions)`

Sets the layer options

###### Parameters

* `layerOptions` (`{ createRTree?: boolean | undefined; rtreeUpdatedOptions?: Array<string> | undefined; animatedOptions?: Array<string> | undefined; renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; ... 59 more ...; distortionMeasure?: DistortionMeasure | undefined; }`)
  * Layer options to set
* `setOptionsOptions?` (`Partial<SetOptionsOptions> | undefined`)
  * Options when setting the options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setLayerOptions({ transformationType: 'thinPlateSpline' })
```

### `WarpedMapLayer#setMapsOptions(mapIds, mapOptions, layerOptions, setOptionsOptions)`

Sets the map options of specific map IDs

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs for which to set the options
* `mapOptions` (`{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsSize?: number | undefined; renderGcpsColor?: string | undefined; renderGcpsBorderSize?: number | undefined; ... 55 more ...; distortionMeasure?: DistortionMeasure | u...`)
  * Options to set
* `layerOptions?` (`Partial<Partial<WebGL2RenderOptions>> | undefined`)
  * Layer options to set
* `setOptionsOptions?` (`Partial<SetOptionsOptions> | undefined`)
  * Options when setting the options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setMapsOptions([myMapId], { transformationType: 'thinPlateSpline' })
```

### `WarpedMapLayer#setMapsOptionsByMapId(mapOptionsByMapId, layerOptions, setOptionsOptions)`

Sets the map options of specific maps by map ID

###### Parameters

* `mapOptionsByMapId` (`Map<string, Partial<WebGL2WarpedMapOptions>>`)
  * Map options to set by map ID
* `layerOptions?` (`Partial<Partial<WebGL2RenderOptions>> | undefined`)
  * Layer options to set
* `setOptionsOptions?` (`Partial<SetOptionsOptions> | undefined`)
  * Options when setting the options

###### Returns

`void`.
