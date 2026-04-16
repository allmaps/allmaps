# @allmaps/basemap

The package generates the Allmaps basemap style.

Preview:

![](https://github.com/allmaps/allmaps/blob/main/packages/basemap/example.webp?raw=true)

## How it works

The style follows the [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/) and has the following properties:

* **Map data** (city labels, roads, water features and other essential location context) is loaded via the [Protomaps](https://protomaps.com/) [OSM Basemap](https://docs.protomaps.com/basemaps/downloads). This is a 120GB basemap vector cartographic tileset created from OpenStreetMap and other open data sources and served using the [PMTiles format](https://docs.protomaps.com/pmtiles/).
* **Terrain data** is loaded using [Mapterhorn](https://mapterhorn.com), which provides a basemap raster tileset created from public terrain data and is also served using the PMTiles format.
* **Styling** similar to [@allmaps/ui](../../packages/ui/) is applied, with custom Allmaps colors and fonts. Sprites are reused from the Protomaps style.

## Installation

This package works in browsers and in Node.js as an ESM module.

Install with pnpm:

```sh
pnpm install @allmaps/basemap
```

## Usage

In a **MapLibre** map.

```js
import { Map as MapLibreMap, addProtocol } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

import { basemapStyle } from '@allmaps/basemap'

let container: HTMLElement

let map: MapLibreMap

const protocol = new Protocol()
addProtocol('pmtiles', protocol.tile)

map = new MapLibreMap({
  container,
  // @ts-expect-error MapLibre types are incompatible
  style: basemapStyle('en')
})
```

<!-- In an **OpenLayers** map.

```js
import { apply } from 'ol-mapbox-style'

import OpenLayersMap from 'ol/Map'
import LayerGroup from 'ol/layer/Group.js'

import { basemapStyle } from '@allmaps/basemap'

let container: HTMLElement

let map: OpenLayersMap

map = new OpenLayersMap({
  target: container,
})

const basemap = new LayerGroup()
apply(basemap, basemapStyle('en'))
map.addLayer(basemap)
``` -->

## License

MIT

## API

### `addTerrain(map, maplibregl, tiles)`

###### Parameters

* `map` (`Map`)
* `maplibregl` (`unknown`)
* `tiles?` (`string | undefined`)

###### Returns

`void`.

### `basemapStyle(lang, glyphs, sprite, tileJson)`

###### Parameters

* `lang` (`string`)
* `glyphs?` (`string | undefined`)
* `sprite?` (`string | undefined`)
* `tileJson?` (`string | undefined`)

###### Returns

`{ version: 8; name?: string; metadata?: unknown; center?: Array<number>; zoom?: number; bearing?: number; pitch?: number; light?: LightSpecification; ... 5 more ...; layers: Array<LayerSpecification>; }`.

### `removeTerrain(map)`

###### Parameters

* `map` (`Map`)

###### Returns

`void`.
