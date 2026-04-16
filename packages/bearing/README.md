# @allmaps/bearing

Computes the bearing of a Georeferenced Map or Warped Map.

The bearing is returned in degrees, measured from the north line (by default) in the clockwise direction.

![](https://github.com/allmaps/allmaps/blob/main/packages/bearing/example.webp?raw=true)

*Example of a map with a bearing of 30°*

## How it works

The bearing is computed by taking a vertical and horizontal straight line between two points in resource space, transforming these to projected geographic space, and computing the clockwise (a.k.a. negative) angle they form with the respective vertical and horizontal axis in projected geographic space.

From the description above it follows that the bearing computed in this package is a *grid bearing*, computed relative to the map projection's vertical line. Since the default projection for warped maps (and their projected transformers) is WebMercator (see [@allmaps/render](../render/)) this vertical axis points to the true north and the resulting bearing is a classical *absolute true bearing* (clockwise angles from true north). **For non-standard projections**, specify a projection in the options to obtain the grid bearing in that projection, and correct with the true north bearing at the maps center to obtain the absolute true bearing.

For rendering purposes it is desirable to consider how both **horizontal and vertical** resource space lines are transformed and define the bearing as the (angular) mean between both angles. In some contexts, e.g. for skewed maps with polynomial transformation where vertical resource axis pointed north, one might be interested in only considering the vertical resource line. This can be specified in the options.

## Usage

```js
import { parseAnnotation, generateAnnotation } from '@allmaps/annotation'
import { computeGeoreferencedMapBearing } from '@allmaps/bearing'

const annotation = await fetch(
  'https://annotations.allmaps.org/maps/95eeba91177d2a1d'
).then((response) => response.json())

const maps = parseAnnotation(annotation)
const bearing = computeGeoreferencedMapBearing(maps[0])
// bearing = 30.48243288240172
```

## License

MIT

## API

### `computeGeoreferencedMapBearing(georeferencedMap, options)`

Compute the bearing of a Georeferenced Map.

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: st...`)
  * Georeferenced Map
* `options?` (`Partial<{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; ... 6 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions & TransformationTypeInputs> | undefined`)

###### Returns

The bearing of the map in degrees, measured from the north line (`number`).

### `computeWarpedMapBearing(warpedMap, options)`

Compute the bearing of a Warped Map.

###### Parameters

* `warpedMap` (`WarpedMap`)
  * Warped Map
* `options?` (`Partial<{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; ... 6 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions & TransformationTypeInputs> | undefined`)

###### Returns

The bearing of the map in degrees, measured from the north line (`number`).
