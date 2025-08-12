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

### `computeGeoreferencedMapBearing(map)`

Computes the bearing of a Georeferenced Map.

###### Parameters

* `map` (`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: string; i...`)
  * Georeferenced Map

###### Returns

The bearing of the map in degrees, measured from the north line (`number`).
