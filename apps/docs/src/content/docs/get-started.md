---
title: Get Started
description: ''
---

## Using the results

Viewer
In website with OpenLayers plugin (and leaflet)

Tile Server, QGIS,

OHM

GDAL, GeoTIFF
export to GeoJSON

```json
{ "json": true }
```

```ts twoslash
interface IdLabel {
  id: number /* some fields */
}
interface NameLabel {
  name: string /* other fields */
}
type NameOrId<T extends number | string> = T extends number
  ? IdLabel
  : NameLabel
// This comment should not be included

// ---cut---
function createLabel<T extends number | string>(idOrName: T): NameOrId<T> {
  const chips = 'ss'

  const beer = chips + '88'

  throw 'unimplemented'
}

let a = createLabel('typescript')
```
