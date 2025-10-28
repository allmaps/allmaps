# @allmaps/basemap

[Protomaps](https://protomaps.com/) basemap for MapLibre

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
