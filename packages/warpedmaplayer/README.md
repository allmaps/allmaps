# @allmaps/warpedmaplayer

Base class for Allmaps plugins. This class contains the main logic for the WarpedMapLayer class exported by the Leaflet, OpenLayers and MapLibre plugins for Allmaps, which allow displaying georeferenced [IIIF images](https://iiif.io/) on a webmap. These plugins work by loading [Georeference Annotations](https://iiif.io/api/georef/extension/georef/) and use WebGL to transform images from a IIIF image server to overlay them on their correct geographical position.

## How it works

This plugin creates a new class `WarpedMapLayer` which extends or is implemented by the `Layer` classes of the webmap libraries Leaflet, OpenLayers and MapLibre. Where it extends (MapLibre), the methods defined in this package are inherited automatically. Where it is implemented (Leaflet and OpenLayers) any changes to these methods should be copy-pasted to the implementing classes (see comments in the code).

To understand what happens under the hood for each georeferenced map, see the [@allmaps/render](../render/) package.

## Installation

This package works in browsers and in Node.js as an ESM or an UMD module.

Install with pnpm:

```sh
pnpm install @allmaps/warpedmaplayer
```

You can optionally build this package locally by running:

```sh
pnpm run build
```

## Usage

This package contains the main logic for the WarpedMapLayer class exported by the Allmaps plugins for Leaflet, OpenLayers and MapLibre. It should not be used directly. See the readme of the plugins for more usage information.

Use this readme to understand the API of the WarpedMapLayer methods shared between the plugins, including **event types** emitted by a WarpedMapLayer instance and a list of available **options**.

### Events

The following events are emitted by the native map object to inform you of the state of the `WarpedMapLayer`.

| Type                            | Description                                                                                                                          |
|---------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `imageinfosadded`              | Image infos have been directly added into the warped map list                                                                       |
| `georeferenceannotationadded`   | A georeference annotation has been added to the warped map list                                                                      |
| `georeferenceannotationremoved` | A georeference annotation has been removed from the warped map list                                                                  |
| `warpedmapadded`                | A warped map has been added to the warped map list                                                                                   |
| `warpedmapremoved`              | A warped map has been removed from the warped map list                                                                               |
| `warpedmapentered`              | A warped map has entered the viewport                                                                                                |
| `warpedmapleft`                 | A warped map has left the viewport                                                                                                   |
| `imageloaded`                   | An image was loaded for a map from cache or by fetching image info                                                                   |
| `maptilesloadedfromsprites`     | Tiles have been loaded to the tile cache from a fetched sprites image map                                                                             |
| `maptileloaded`                 | A tile has been loaded to the tile cache for a map                                                                                   |
| `maptiledeleted`                | A tile has been deleted from the tile cache for a map                                                                                |
| `firstmaptileloaded`            | The cache loaded a first tile of a map                                                                                               |
| `allrequestedtilesloaded`       | All tiles requested for the current viewport have been loaded                                                                        |
| `cleared`                       | The warped map list has been cleared                                                                                                 |
| `preparechange`                 | An upcoming options change has been prepared for a specific map (by mixing previous and new properties if the animation was ongoing) |
| `immediatechange`               | An options change has been processed immediately                                                                                     |
| `animatedchange`                | An options change has been processed with an animation                                                                               |

Event data follows the `Partial<WarpedMapEventData>` type:

```ts
export type WarpedMapEventData = {
  mapIds: string[]
  tileUrl: string
  optionKeys: string[]
  spritesInfo: SpritesInfo
}
```

### Options

Options can be set on a `WarpedMapLayer` both as *layer options*, which apply to all maps, or as individual *map options*. For each map, the final options that are applied to it result from merging the *default options*, options specified in the *georeference annotation* (like `resourceMask`, `transformationType`, `internalProjection` and `gcps`), *layer options* and *map options*. When merging options, `undefined` options are neglected, so setting a layer or map option to undefined effectively resets it.

The following options are available:

| Key                          | Description                                                                                                                                                                                                 | Default                                                                                                  |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| `applyMask`                  | Apply the resource mask (if false, the full mask is used)                                                                                                                                                   | `true`                                                                                                   |
| `colorize`                   | Colorize the map                                                                                                                                                                                            | `false`                                                                                                  |
| `colorizeColor`              | Color to colorize the map                                                                                                                                                                                   | `"#ff56ba"`                                                                                              |
| `debugTiles`                 | Debug: show the tile boundaries                                                                                                                                                                             | `false`                                                                                                  |
| `debugTriangles`             | Debug: show the triangulation triangles                                                                                                                                                                     | `false`                                                                                                  |
| `distortionColor00`          | First color in the `'log2sigma'` distortion                                                                                                                                                                 | `"#fe5e60"`                                                                                              |
| `distortionColor01`          | Second color in the `'log2sigma'` distortion                                                                                                                                                                | `"#3b44ad"`                                                                                              |
| `distortionColor1`           | Color in the `'twoOmega'` distortion                                                                                                                                                                        | `"#64c18f"`                                                                                              |
| `distortionColor2`           | Color in the `'airyKavr'` distortion                                                                                                                                                                        | `"#ffc742"`                                                                                              |
| `distortionColor3`           | Color in the `'signDetJ'` distortion                                                                                                                                                                        | `"#fe5e60"`                                                                                              |
| `distortionMeasures`         | Distortion measures to be computed                                                                                                                                                                          | `['log2sigma', 'twoOmega']`                                                                              |
| `gcps`                       | Ground control points                                                                                                                                                                                       | `[]` (overwritten by the GCPs in the georeference annotation)                                            |
| `internalProjection`         | Internal projection (see [@allmaps/project](../project/))                                                                                                                                          | `WebMercatorProjection` (possibly overwritten by the internal projection in the georeference annotation) |
| `opacity`                    | Opacity                                                                                                                                                                                                     | `1`                                                                                                      |
| `projection`                 | Projection (see [@allmaps/project](../project/))                                                                                                                                                   | `WebMercatorProjection`                                                                                  |
| `removeColor`                | Remove color                                                                                                                                                                                                | `false`                                                                                                  |
| `removeColorColor`           | Color to remove                                                                                                                                                                                             | `"#222222"`                                                                                              |
| `removeColorHardness`        | Hardness when removing color                                                                                                                                                                                | `0.7`                                                                                                    |
| `removeColorThreshold`       | Threshold when removing color                                                                                                                                                                               | `0`                                                                                                      |
| `renderAppliableMask`        | Render the *appliable mask*, which is the resource mask as specified in the georeferenced annotation (or options), even when the mask is not applied (see the `applyMask` option) and the full mask is used | `false`                                                                                                  |
| `renderAppliableMaskColor`   | Color when rendering the appliable mask                                                                                                                                                                     | `"#ff56ba"`                                                                                              |
| `renderAppliableMaskSize`    | Size in viewport pixels when rendering the appliable mask                                                                                                                                                   | `8`                                                                                                      |
| `renderFullMask`             | Render the full mask                                                                                                                                                                                        | `false`                                                                                                  |
| `renderFullMaskColor`        | Color when rendering the full mask                                                                                                                                                                          | `"#64c18f"`                                                                                              |
| `renderFullMaskSize`         | Size in viewport pixels when rendering the full mask                                                                                                                                                        | `8`                                                                                                      |
| `renderGcps`                 | Render the GCPs                                                                                                                                                                                             | `false`                                                                                                  |
| `renderGcpsColor`            | Color when rendering the GCPs                                                                                                                                                                               | `"#63d8e6"`                                                                                              |
| `renderGcpsSize`             | Size in viewport pixels when rendering the GCPs                                                                                                                                                             | `16`                                                                                                     |
| `renderGrid`                 | Render the grid                                                                                                                                                                                             | `false`                                                                                                  |
| `renderGridColor`            | Color when rendering the grid                                                                                                                                                                               | `"#222222"`                                                                                              |
| `renderMask`                 | Render the mask                                                                                                                                                                                             | `false`                                                                                                  |
| `renderMaskColor`            | Color when rendering the mask                                                                                                                                                                               | `"#ff56ba"`                                                                                              |
| `renderMaskSize`             | Size in viewport pixels when rendering the mask                                                                                                                                                             | `8`                                                                                                      |
| `renderTransformedGcps`      | Render the transformed GCPs                                                                                                                                                                                 | `false`                                                                                                  |
| `renderTransformedGcpsColor` | Color when rendering the transformed GCPs                                                                                                                                                                   | `"#ff56ba"`                                                                                              |
| `renderTransformedGcpsSize`  | Size in viewport pixels when rendering the transformed GCPs                                                                                                                                                 | `16`                                                                                                     |
| `renderVectors`              | Render the vectors connecting each GCP with its respective transformed GCP                                                                                                                                  | `false`                                                                                                  |
| `renderVectorsColor`         | Color when rendering the vectors                                                                                                                                                                            | `"#222222"`                                                                                              |
| `renderVectorsSize`          | Size in viewport pixels when rendering the vectors                                                                                                                                                          | `6`                                                                                                      |
| `resourceMask`               | Resource mask                                                                                                                                                                                               | `[]` (overwritten by the resource mask in the georeference annotation)                                   |
| `saturation`                 | Saturation                                                                                                                                                                                                  | `1`                                                                                                      |
| `transformationType`         | Transformation type                                                                                                                                                                                         | `"polynomial"` (possibly overwritten by the transformation type in the georeference annotation)          |
| `visible`                    | Visible                                                                                                                                                                                                     | `true`                                                                                                   |

### What is a *map*?

Leaflet, OpenLayer and MapLibre each have their concept of a 'map' as the central class their API (see Leaflet [`Map`](https://leafletjs.com/reference.html#map), OpenLayers [`Map`](https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html) and MapLibre [`Map`](https://maplibre.org/maplibre-gl-js/docs/API/classes/maplibregl.Map/)). It generally refers to a `<div>` an a page where tiles or WebGL logic is used to render a projection of the world.

In Allmaps the concept 'map' is rather related to a Georeference Annotation. There are different classes named 'map', one for each phase a map takes through the Allmaps rendering pipeline:

* When a Georeference Annotation is parsed, an instance of the `GeoreferencedMap` class is created from it.
* When this map is loaded into an application for rendering, an instance of the `WarpedMap` class is created from it.
* Inside the WebGL2 Renderer, the `WebGL2WarpedMap` class is used to render the map.

All these map phases originating from the same Georeference Annotation have the same unique `mapId` property. This string value is used though-out Allmaps (and in the API below) to identify a map. It is returned after adding a georeference annotation to a warpedMapLayer, so you can use it later to call functions on a specific map.

Note that since a WarpedMapLayer can load multiple Georeference Annotations, we could have multiple Allmaps 'maps' on e.g. one Leaflet 'map'.

## License

MIT

## API

### `new BaseWarpedMapLayer(defaultSpecificWarpedMapLayerOptions, options)`

Creates a WarpedMapLayer instance

###### Parameters

* `defaultSpecificWarpedMapLayerOptions` (`SpecificWarpedMapLayerOptions`)
* `options?` (`  | Partial<SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>>
    | undefined`)
  * options

###### Returns

`BaseWarpedMapLayer<SpecificWarpedMapLayerOptions>`.

### `BaseWarpedMapLayer#addEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `BaseWarpedMapLayer#addGeoreferenceAnnotation(annotation, mapOptions)`

Adds a Georeference Annotation

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation
* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map options

###### Returns

Map IDs of the maps that were added, or an error per map (`Array<string | Error>`).

### `BaseWarpedMapLayer#addGeoreferenceAnnotationByUrl(annotationUrl, mapOptions)`

Adds a Georeference Annotation by URL

###### Parameters

* `annotationUrl` (`string`)
  * URL of a Georeference Annotation
* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map options

###### Returns

Map IDs of the maps that were added, or an error per map (`Promise<Array<string | Error>>`).

### `BaseWarpedMapLayer#addGeoreferencedMap(georeferencedMap, mapOptions)`

Adds a Georeferenced Map

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced Map
* `mapOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map options

###### Returns

Map ID of the map that was added (`string`).

### `BaseWarpedMapLayer#addImageInfos(imageInfos)`

Adds image information to the WarpedMapList's image information cache

###### Parameters

* `imageInfos` (`Array<unknown>`)
  * Image informations

###### Returns

Image IDs of the image informations that were added (`Array<string>`).

### `BaseWarpedMapLayer#addSprites(sprites, imageUrl, imageSize)`

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

### `BaseWarpedMapLayer#bringMapsForward(mapIds)`

Bring maps forward

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.

### `BaseWarpedMapLayer#bringMapsToFront(mapIds)`

Bring maps to front

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.

### `BaseWarpedMapLayer#canvas?`

###### Type

```ts
HTMLCanvasElement
```

### `BaseWarpedMapLayer#clear()`

Removes all warped maps from the layer

###### Parameters

There are no parameters.

###### Returns

`void`.

### `BaseWarpedMapLayer#container?`

###### Type

```ts
HTMLDivElement
```

### `BaseWarpedMapLayer#contextLost(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `BaseWarpedMapLayer#contextRestored(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `BaseWarpedMapLayer#defaultSpecificWarpedMapLayerOptions`

###### Type

```ts
SpecificWarpedMapLayerOptions
```

### `BaseWarpedMapLayer#getBbox(options)`

Get the bounding box of all maps in the layer

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `options?` (`Partial<ProjectionOptions & MaskOptions> | undefined`)
  * Mask and projection options, defaults to applied mask and current projection

###### Returns

The bbox of all maps, in the chosen projection, or undefined if there were no maps (`Bbox | undefined`).

### `BaseWarpedMapLayer#getCenter(options)`

Get the center of the bounding box of all maps in the layer

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `options?` (`Partial<ProjectionOptions & MaskOptions> | undefined`)
  * Mask and projection options, defaults to applied mask and current projection

###### Returns

The center of the bbox of all maps, in the chosen projection, or undefined if there were no maps (`Point | undefined`).

### `BaseWarpedMapLayer#getConvexHull(options)`

Get the convex hull of all maps in the layer

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `options?` (`Partial<ProjectionOptions & MaskOptions> | undefined`)
  * Mask and projection options, defaults to applied mask and current projection

###### Returns

The convex hull of all maps, in the chosen projection, or undefined if there were no maps (`Ring | undefined`).

### `BaseWarpedMapLayer#getDefaultOptions()`

Get the default options the layer

###### Parameters

There are no parameters.

###### Returns

`SpecificWarpedMapLayerOptions &
  SpecificBaseRenderOptions<WebGL2WarpedMap> &
  Partial<WarpedMapListOptions<WebGL2WarpedMap>> &
  SpecificWebGL2WarpedMapOptions &
  SpecificTriangulatedWarpedMapOptions &
  WarpedMapOptions`.

### `BaseWarpedMapLayer#getLayerOptions()`

Get the layer options

###### Parameters

There are no parameters.

###### Returns

`{ [P in keyof (SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>)]?: (SpecificWarpedMapLayerOptions & Partial<...>)[P] | undefined; }`.

### `BaseWarpedMapLayer#getMapDefaultOptions(mapId)`

Get the default options of a map

These come from the default option settings for WebGL2WarpedMaps and the map's georeferenced map proporties

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`WebGL2WarpedMapOptions | undefined`.

### `BaseWarpedMapLayer#getMapIds()`

Get mapIds for all maps in the layer

Note: more selection options are available on this function of WarpedMapList

###### Parameters

There are no parameters.

###### Returns

The mapIds of all maps (`Array<string>`).

### `BaseWarpedMapLayer#getMapMapOptions(mapId)`

Get the map-specific options of a map

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`Partial<WebGL2WarpedMapOptions> | undefined`.

### `BaseWarpedMapLayer#getMapOptions(mapId)`

Get the options of a map

These options are the result of merging the default, georeferenced map,
layer and map-specific options of that map.

###### Parameters

* `mapId` (`string`)
  * Map ID for which the options apply

###### Returns

`WebGL2WarpedMapOptions | undefined`.

### `BaseWarpedMapLayer#getMapZIndex(mapId)`

Get the z-index of a map

###### Parameters

* `mapId` (`string`)
  * Map ID for which to get the z-index

###### Returns

The z-index of a map (`number | undefined`).

### `BaseWarpedMapLayer#getMapsBbox(mapIds, options)`

Get the bounding box of all selected maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `options?` (`Partial<ProjectionOptions & MaskOptions> | undefined`)
  * Mask and projection options, defaults to applied mask and current projection

###### Returns

The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Bbox | undefined`).

### `BaseWarpedMapLayer#getMapsCenter(mapIds, options)`

Get the center of the bounding box of all selected maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `options?` (`Partial<ProjectionOptions & MaskOptions> | undefined`)
  * Mask and projection options, defaults to applied mask and current projection

###### Returns

The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Point | undefined`).

### `BaseWarpedMapLayer#getMapsConvexHull(mapIds, options)`

Get the convex hull of all selected maps maps

The result is returned in lon-lat `EPSG:4326` by default.

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs
* `options?` (`Partial<ProjectionOptions & MaskOptions> | undefined`)
  * Mask and projection options, defaults to applied mask and current projection

###### Returns

The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection (`Ring | undefined`).

### `BaseWarpedMapLayer#getOpacity()`

Get the layer opacity

Returns a number between 0 and 1 (the default)

###### Parameters

There are no parameters.

###### Returns

`number`.

### `BaseWarpedMapLayer#getWarpedMap(mapId)`

Get the WarpedMap instance for a map

###### Parameters

* `mapId` (`string`)
  * Map ID of the requested WarpedMap instance

###### Returns

`WebGL2WarpedMap | undefined`.

### `BaseWarpedMapLayer#getWarpedMapList()`

Get the WarpedMapList object that contains a list of the warped maps of all loaded maps

###### Parameters

There are no parameters.

###### Returns

`WarpedMapList<WebGL2WarpedMap>`.

### `BaseWarpedMapLayer#getWarpedMaps(mapIds)`

Get the WarpedMap instances for all maps, or all selected maps

If no argument is passed, the WarpedMap instance of all maps in the layer is passed

Note: more selection options are available on this function of WarpedMapList

###### Parameters

* `mapIds?` (`Array<string> | undefined`)
  * Map IDs

###### Returns

The WarpedMap instance of all (selected) map (`Array<WebGL2WarpedMap>`).

### `BaseWarpedMapLayer#gl?`

###### Type

```ts
WebGL2RenderingContext
```

### `BaseWarpedMapLayer#nativePassWarpedMapEvent(event)`

###### Parameters

* `event` (`Event`)

###### Returns

`void`.

### `BaseWarpedMapLayer#nativeUpdate()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `BaseWarpedMapLayer#options`

###### Type

```ts
SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>
```

### `BaseWarpedMapLayer#removeEventListeners()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `BaseWarpedMapLayer#removeGeoreferenceAnnotation(annotation)`

Removes a Georeference Annotation

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation

###### Returns

Map IDs of the maps that were removed, or an error per map (`Array<string | Error>`).

### `BaseWarpedMapLayer#removeGeoreferenceAnnotationByUrl(annotationUrl)`

Removes a Georeference Annotation by URL

###### Parameters

* `annotationUrl` (`string`)
  * URL of a Georeference Annotation

###### Returns

Map IDs of the maps that were removed, or an error per map (`Promise<Array<string | Error>>`).

### `BaseWarpedMapLayer#removeGeoreferencedMap(georeferencedMap)`

Removes a Georeferenced Map

###### Parameters

* `georeferencedMap` (`unknown`)
  * Georeferenced Map

###### Returns

Map ID of the map that was removed (`string`).

### `BaseWarpedMapLayer#removeGeoreferencedMapById(mapId)`

Removes a Georeferenced Map by its ID

###### Parameters

* `mapId` (`string`)
  * Map ID of the georeferenced map to remove

###### Returns

Map ID of the map that was removed (`string`).

### `BaseWarpedMapLayer#renderer?`

###### Type

```ts
WebGL2Renderer
```

### `BaseWarpedMapLayer#resetLayerOptions(layerOptionKeys, animationOptions)`

Reset the layer options

Undefined option keys reset all options

Doesn't reset render options or specific warped map layer options. Use setOptions() instead.

###### Parameters

* `layerOptionKeys?` (`Array<string> | undefined`)
  * Keys of the layer options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `BaseWarpedMapLayer#resetMapsAndListOptions(mapIds, mapsOptionKeys, layerOptionKeys, animationOptions)`

Reset the map-specific options of the specified maps, and the layer options

Omitting `mapsOptionKeys` or `layerOptionKeys` resets all options for that scope;
passing an empty array resets none.

###### Parameters

* `mapIds` (`Array<string>`)
  * IDs of the maps whose options to reset
* `mapsOptionKeys?` (`  | Array<
        | keyof SpecificWebGL2WarpedMapOptions
        | keyof SpecificTriangulatedWarpedMapOptions
        | keyof WarpedMapOptions     >
    | undefined`)
  * Keys of the map-specific options to reset
* `layerOptionKeys?` (`  | Array<
        | keyof SpecificWebGL2WarpedMapOptions
        | keyof SpecificTriangulatedWarpedMapOptions
        | keyof WarpedMapOptions     >
    | undefined`)
  * Keys of the layer options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `BaseWarpedMapLayer#resetMapsOptions(mapIds, mapsOptionKeys, animationOptions)`

Reset the map-specific options of the specified maps

Omitting `mapsOptionKeys` resets all options; passing an empty array resets none.

###### Parameters

* `mapIds` (`Array<string>`)
  * IDs of the maps whose options to reset
* `mapsOptionKeys?` (`  | Array<
        | keyof SpecificWebGL2WarpedMapOptions
        | keyof SpecificTriangulatedWarpedMapOptions
        | keyof WarpedMapOptions     >
    | undefined`)
  * Keys of the options to reset
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `BaseWarpedMapLayer#sendMapsBackward(mapIds)`

Send maps backward

###### Parameters

* `mapIds` (`Iterable<string>`)
  * IDs of the maps

###### Returns

`void`.

### `BaseWarpedMapLayer#sendMapsToBack(mapIds)`

Send maps to back

###### Parameters

* `mapIds` (`Array<string>`)
  * IDs of the maps

###### Returns

`void`.

### `BaseWarpedMapLayer#setLayerOptions(layerOptions, animationOptions)`

Set the layer options

Doesn't set render options or specific warped map layer options. Use setOptions() instead.

###### Parameters

* `layerOptions?` (`Partial<WarpedMapListOptions<WebGL2WarpedMap>> | undefined`)
  * Layer options to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options
  ```js
  warpedMapLayer.setLayerOptions({ transformationType: 'thinPlateSpline' })
  ```

###### Returns

`void`.

### `BaseWarpedMapLayer#setLayerTransformationType(transformationType, animationOptions)`

Set the transformation type of the layer

###### Parameters

* `transformationType?` (`TransformationType | undefined`)
  * Transformation type to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

### `BaseWarpedMapLayer#setMapGcps(mapId, gcps, animationOptions)`

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

### `BaseWarpedMapLayer#setMapOptions(mapId, mapOptions, animationOptions)`

Set the map-specific options of a map

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
* `mapOptions` (`{ renderMaps?: boolean | undefined; renderLines?: boolean | undefined; renderPoints?: boolean | undefined; renderGcps?: boolean | undefined; renderGcpsColor?: string | undefined; renderGcpsSize?: number | undefined; renderGcpsBorderColor?: string | undefined; ... 56 more ...; distortionMeasure?: DistortionMeasure | ...`)
  * Map-specific options to set
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setMapOptions(myMapId, { transformationType: 'thinPlateSpline' })
```

### `BaseWarpedMapLayer#setMapResourceMask(mapId, resourceMask, animationOptions)`

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

### `BaseWarpedMapLayer#setMapTransformationType(mapId, transformationType, animationOptions)`

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

### `BaseWarpedMapLayer#setMapsAndLayerOptions(mapIds, mapsOptions, layerOptions, animationOptions)`

Set the map-specific options of the specified maps, and the layer options

Useful when map-specific options are changed for multiple maps at once,
together with the layer options, but only one animation should be fired.

Doesn't set render options or specific warped map layer options. Use setOptions() instead.

###### Parameters

* `mapIds` (`Array<string>`)
  * IDs of the maps whose options to set
* `mapsOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map-specific options to apply to each of those maps
* `layerOptions?` (`Partial<WarpedMapListOptions<WebGL2WarpedMap>> | undefined`)
  * Layer options to apply
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setMapsAndLayerOptions([myMapId], { transformationType: 'thinPlateSpline' }, { visible: true })
```

### `BaseWarpedMapLayer#setMapsOptions(mapIds, mapsOptions, animationOptions)`

Set the map-specific options of the specified maps

In general setting a map-specific option
also sets the corresponding option of the map,
since these are the result of merging the default, georeferenced map,
layer and map-specific options of that map.

A special case is setting a map-specific option to `undefined`:
then the corresponding option is derived from the default, georeferenced map or layer option.
This is equivalent to using the reset function for map-specific option.

Useful when map-specific options are changed for multiple maps at once,
but only one animation should be fired.

###### Parameters

* `mapIds` (`Array<string>`)
  * Map IDs of the maps whose options to set
* `mapsOptions?` (`Partial<WebGL2WarpedMapOptions> | undefined`)
  * Map-specific options to apply to each of those maps
* `animationOptions?` (`Partial<AnimationOptions> | undefined`)
  * Animation options

###### Returns

`void`.

###### Examples

```ts
warpedMapLayer.setMapsOptions([myMapId], { transformationType: 'thinPlateSpline' })
```

### `BaseWarpedMapLayer#setMapsTransformationType(mapIds, transformationType, animationOptions)`

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

### `BaseWarpedMapLayer#setOpacity(opacity)`

Set the layer opacity

###### Parameters

* `opacity` (`number`)
  * Layer opacity to set

###### Returns

`void`.

### `BaseWarpedMapLayer#setOptions(options)`

Set the options

###### Parameters

* `options?` (`  | Partial<WebGL2RenderOptions>
    | Partial<SpecificWarpedMapLayerOptions>
    | undefined`)
  * Options to set

###### Returns

`void`.

### `BaseWarpedMapLayer.assertCanvas(canvas)`

###### Parameters

* `canvas?` (`HTMLCanvasElement | undefined`)

###### Returns

`void`.

### `BaseWarpedMapLayer.assertRenderer(renderer)`

###### Parameters

* `renderer?` (`WebGL2Renderer | undefined`)

###### Returns

`void`.
