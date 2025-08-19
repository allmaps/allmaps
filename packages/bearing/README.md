# @allmaps/bearing

Computes the bearing of a Georeferenced Map. Uses [Turf.js](https://turfjs.org/docs/api/bearing) internally.

```js
import { parseAnnotation, generateAnnotation } from '@allmaps/annotation'
import { computeGeoreferencedMapBearing } from '@allmaps/bearing'

const annotation = await fetch(
  'https://annotations.allmaps.org/maps/0d76ed1b985f3913@cf34c4646fee9f4d'
).then((response) => response.json())

const maps = parseAnnotation(annotation)
const bearing = computeGeoreferencedMapBearing(maps[0])
console.log(bearing)
```

## License

MIT

## API

### `computeGeoreferencedMapBearing(georeferencedMap, options)`

Computes the bearing of a Georeferenced Map.

###### Parameters

* `georeferencedMap` (`{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: st...`)
  * Georeferenced Map
* `options?` (`Partial<{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; ... 4 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions & TransformationTypeInputs> | undefined`)

###### Returns

The bearing of the map in degrees, measured from the north line (`number`).

### `computeWarpedMapBearing(warpedMap, options)`

Computes the bearing of a Warped Map.

###### Parameters

* `warpedMap` (`WarpedMap`)
  * Warped Map
* `options?` (`Partial<{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; minOffsetDistance: number; minLineDistance: number; ... 4 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions & TransformationTypeInputs> | undefined`)

###### Returns

The bearing of the map in degrees, measured from the north line (`number`).
