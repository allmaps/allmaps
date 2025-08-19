# @allmaps/warpedmaplayer

Base class for Allmaps plugins. This class contains the main logic for the WarpedMapLayer class exported by the Leaflet, OpenLayers and MapLibre plugins for Allmaps, which allow displaying georeferenced [IIIF images](https://iiif.io/) on a webmap. These plugins work by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and use WebGL to transform images from a IIIF image server to overlay them on their correct geographical position.

## How it works

This plugin creates a new class `WarpedMapLayer` which extends or is implemented by the `Layer` classes of the webmap libraries Leaflet, OpenLayers and MapLibre. Where it extends (MapLibre), the methods defined in this package are inherited automatically. Where it is implemented (Leaflet and OpenLayers) any changes to these methods should be copy-pasted to the implementing classes (see comments in the code).

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

This package contains the main logic for the WarpedMapLayer class exported by the Allmaps plugins for Leaflet, OpenLayers and MapLibre. It should not be used directly. See the readme of the plugins for more usage information. Use this readme to understand the API of the WarpedMapLayer methods shared between the plugins.

### Events

The following events are emitted to inform you of the state of the `WarpedMapLayer`.

  | Description                                                                                                                          | Type                            |
  |--------------------------------------------------------------------------------------------------------------------------------------|---------------------------------|
  | A georeference annotation has been added to the warped map list                                                                      | `georeferenceannotationadded`   |
  | A georeference annotation has been removed from the warped map list                                                                  | `georeferenceannotationremoved` |
  | A warped map has been added to the warped map list                                                                                   | `warpedmapadded`                |
  | A warped map has been removed from the warped map list                                                                               | `warpedmapremoved`              |
  | A warped map has entered the viewport                                                                                                | `warpedmapentered`              |
  | A warped map has left the viewport                                                                                                   | `warpedmapleft`                 |
  | The image information has been loaded from a map                                                                                     | `imageinfoloaded`               |
  | A tile has been loaded to the tile cache for a map                                                                                   | `maptileloaded`                 |
  | A tile has been deleted from the tile cache for a map                                                                                | `maptiledeleted`                |
  | The cache loaded a first tile of a map                                                                                               | `firstmaptileloaded`            |
  | All tiles requested for the current viewport have been loaded                                                                        | `allrequestedtilesloaded`       |
  | The warped map list has been cleared                                                                                                 | `cleared`                       |
  | An upcoming options change has been prepared for a specific map (by mixing previous and new properties if the animation was ongoing) | `preparechange`                 |
  | An options change has been processed immediately                                                                                     | `immediatechange`               |
  | An options change has been processed with an animation                                                                               | `animatedchange`                |

Event data follows the `Partial<WarpedMapEventData>` type:

```ts
export type WarpedMapEventData = {
  mapIds: string[]
  tileUrl: string
  optionKeys: string[]
}
```

### What is a _map_?

Leaflet, OpenLayer and MapLibre each have their concept of a 'map' as the central class their API (see Leaflet [`Map`](https://leafletjs.com/reference.html#map), OpenLayers [`Map`](https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html) and MapLibre [`Map`](https://maplibre.org/maplibre-gl-js/docs/API/classes/maplibregl.Map/)). It generally refers to a `<div>` an a page where tiles or WebGL logic is used to render a projection of the world.

In Allmaps the concept 'map' is rather related to a Georeference Annotation. There are different classes named 'map', one for each phase a map takes through the Allmaps rendering pipeline:

- When a Georeference Annotation is parsed, an instance of the `GeoreferencedMap` class is created from it.
- When this map is loaded into an application for rendering, an instance of the `WarpedMap` class is created from it.
- Inside the WebGL2 Renderer, the `WebGL2WarpedMap` class is used to render the map.

All these map phases originating from the same Georeference Annotation have the same unique `mapId` property. This string value is used though-out Allmaps (and in the API below) to identify a map. It is returned after adding a georeference annotation to a warpedMapLayer, so you can use it later to call functions on a specific map.

Note that since a WarpedMapLayer can load multiple Georeference Annotations, we could have multiple Allmaps 'maps' on e.g. one Leaflet 'map'.

## License

MIT

## API

### `MapLibreWarpedMapLayerOptions`

###### Type

```ts
SpecificWarpedMapListOptions & Partial<WebGL2WarpedMapOptions>
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

### `new WarpedMapLayer(id, options)`

Creates a WarpedMapLayer instance

###### Parameters

- `id?` (`string | undefined`)
  - Unique ID for this layer
- `options?` (`Partial<WebGL2RendererOptions> | undefined`)
  - options

###### Returns

`WarpedMapLayer`.

###### Extends

- `CustomLayerInterface`

### `WarpedMapLayer#addEventListeners()`

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

the map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferenceAnnotationByUrl(annotationUrl)`

Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

###### Parameters

- `annotationUrl` (`string`)
  - Georeference Annotation

###### Returns

the map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#addGeoreferencedMap(georeferencedMap)`

Adds a Georeferenced map.

###### Parameters

- `georeferencedMap` (`unknown`)
  - Georeferenced map

###### Returns

`Promise<string | Error>`.

- the map ID of the map that was added, or an error

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

- bounding box of all warped maps

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
  - ID of the warped map

###### Returns

`number | undefined`.

- z-index of the warped map

### `WarpedMapLayer#getOpacity()`

Gets the opacity of the layer

###### Parameters

There are no parameters.

###### Returns

opacity of the map (`number | undefined`).

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

the warped map list (`WarpedMapList<WebGL2WarpedMap>`).

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

### `WarpedMapLayer#id`

###### Type

```ts
'warped-map-layer'
```

### `WarpedMapLayer#isMapVisible(mapId)`

Returns the visibility of a single map

###### Parameters

- `mapId` (`string`)

###### Returns

`boolean | undefined`.

- whether the map is visible

### `WarpedMapLayer#map?`

###### Type

```ts
Map
```

### `WarpedMapLayer#onAdd(map, gl)`

Method called when the layer has been added to the Map.

###### Parameters

- `map` (`Map`)
  - The Map this custom layer was just added to.
- `gl` (`WebGL2RenderingContext`)
  - The WebGL 2 context for the map.

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
{ createRTree?: boolean | undefined; renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsSize?: number | undefined; ... 52 more ...; distortionMeasure?: DistortionMeasure | undefined; }
```

### `WarpedMapLayer#passWarpedMapEvent(event)`

###### Parameters

- `event` (`Event`)

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

- `annotation` (`unknown`)
  - Georeference Annotation

###### Returns

the map IDs of the maps that were removed, or an error per map (`Promise<Array<string | Error>>`).

### `WarpedMapLayer#removeGeoreferenceAnnotationByUrl(annotationUrl)`

Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.

###### Parameters

- `annotationUrl` (`string`)
  - Georeference Annotation

###### Returns

`Promise<Array<string | Error>>`.

- the map IDs of the maps that were removed, or an error per map

### `WarpedMapLayer#removeGeoreferencedMap(georeferencedMap)`

Removes a Georeferenced map.

###### Parameters

- `georeferencedMap` (`unknown`)
  - Georeferenced map

###### Returns

`Promise<string | Error>`.

- the map ID of the map that was remvoed, or an error

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

- `mapId` (`string`)
  - ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetMapOpacity(mapId)`

Resets the opacity of a single map to fully opaque

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetMapRemoveColor(mapId)`

Resets the color for a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map

###### Returns

`void`.

### `WarpedMapLayer#resetMapSaturation(mapId)`

Resets the saturation of a single map to the original colors

###### Parameters

- `mapId` (`string`)
  - ID of the map

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

### `WarpedMapLayer#setLayerOptions(options)`

Sets the layer options

###### Parameters

- `hexColor` (`string`)
  - desired hex color

###### Returns

`void`.

### `WarpedMapLayer#setImageInformations(imageInformations)`

Sets the object that caches image information

###### Parameters

- `imageInformations` (`globalThis.Map<string, unknown>`)
  - Object that caches image information

###### Returns

`void`.

### `WarpedMapLayer#setMapColorize(mapId, hexColor)`

Sets the colorization for a single mapID of the map

###### Parameters

- `mapId` (`string`)
  - ID of the map
- `hexColor` (`string`)
  - desired hex color

###### Returns

`void`.

### `WarpedMapLayer#setMapOpacity(mapId, opacity)`

Sets the opacity of a single map

###### Parameters

- `mapId` (`string`)
  - ID of the map
- `opacity` (`number`)
  - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque

###### Returns

`void`.

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

`void`.

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

`void`.

### `WarpedMapLayer#setMapsDistortionMeasure(mapIds, distortionMeasure)`

Sets the distortion measure of multiple maps

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps
- `distortionMeasure?` (`DistortionMeasure | undefined`)
  - new transformation type

###### Returns

`void`.

### `WarpedMapLayer#setMapsInternalProjection(mapIds, internalProjection)`

Sets the internal projection of multiple maps

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps
- `internalProjection` (`{name?: string; definition: ProjectionDefinition}`)
  - new internal projection

###### Returns

`void`.

### `WarpedMapLayer#setMapsInternalProjection(mapIds, internalProjection)`

Sets the internal projection of multiple maps

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps
- `distortionMeasure?` (`DistortionMeasure | undefined`)
  - new transformation type

###### Returns

`void`.

### `WarpedMapLayer#setMapsInternalProjection(mapIds, internalProjection)`

Sets the internal projection of multiple maps

###### Parameters

- `mapIds` (`Iterable<string>`)
  - IDs of the maps
- `internalProjection` (`{name?: string; definition: ProjectionDefinition}`)
  - new internal projection

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
  - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque

###### Returns

`void`.

### `WarpedMapLayer#setOptions(options)`

Sets the options

###### Parameters

- `options?` (`Partial<WebGL2RendererOptions> | undefined`)
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

`void`.

### `WarpedMapLayer#setSaturation(saturation)`

Sets the saturation of a single map

###### Parameters

- `saturation` (`number`)
  - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors

###### Returns

`void`.

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
