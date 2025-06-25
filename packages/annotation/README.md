# @allmaps/annotation

Parsing and Generating Georeference Annotations.

## How it works

This module that can generate and parse [Georeference Annotations](https://iiif.io/api/extension/georef/).

A **Georeference Annotation** is a [Web Annotation](https://www.w3.org/TR/annotation-model/) that stores the metadata needed to [georeference](https://en.wikipedia.org/wiki/Georeferencing) a [IIIF image](https://iiif.io/api/image/3.0/). See this [example](./examples/annotation.example.json).

A Georeference Annotation contains the following data:

* The [URI of an IIIF Image](https://iiif.io/api/image/3.0/#3-identifier), as well as its dimensions in pixels.
* A polygonal resource mask that defines the cartographic part of the image.
* A list of ground control points (GCPs) that define the mapping between resource coordinates and geospatial coordinates.

Multiple maps can be defined in an **Annotation Page** (see [spec](https://iiif.io/api/presentation/3.0/#overview-annotationpage)).

Allmaps offers apps and packages for working with Georeference Annotations. [Allmaps Viewer](../../apps/viewer/) can [for example](https://viewer.allmaps.org/#data=data%3Atext%2Fx-url%2Chttps%3A%2F%2Fraw.githubusercontent.com%2Fallmaps%2Fannotation%2Fdevelop%2Fexamples%2Fannotation.example.json) warp IIIF maps in the browser, just by loading a Georeference Annotation.

A **Georeferenced Map** is the format Allmaps uses internally to describe a map and pass it between functions and packages. It contains the same information in a more practical form. See this [example](./examples/map.example.json).

This module allows **parsing** Georeference Annotations to Georeferenced Maps and **generating** Georeference Annotations from Georeferenced Maps.

This module is written in TypeScript and is built using Zod.

<!-- TODO: create Observable notebook that allows you to try out this module! -->

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Node.js:

Install with npm:

```sh
npm install @allmaps/annotation
```

Browser:

```html
<script type="module">
  import { Annotation } from 'https://unpkg.com/@allmaps/annotation?module'
</script>
```

## Usage

```js
import { parseAnnotation, generateAnnotation } from '@allmaps/annotation'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create a warpedMap from the annotation
// Note: always returns an array
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap = georeferencedMaps[0]

// Use or modify the georeferencedMap(s)
// ...

// Generate Georeference Annotation
// Note: returns an annotation or annotation page based on input
const georeferenceAnnotation = generateAnnotation(georeferencedMap)
const georeferenceAnnotationPage = generateAnnotation(georeferencedMaps)
```

See the API below for more details.

## License

MIT

## API

### `Annotation`

###### Type

```ts
{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOfItem> | undefined; } | { ...; } | { ...; }; selector: { ...; }; }; ... 5 more ...; motivation?: string | undefined; }
```

### `AnnotationPage`

###### Type

```ts
{ type: "AnnotationPage"; items: Array<{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOfItem> | undefined; } | { ...; } | { ...; }; selector: { ...; }; }; ... 5 more ...; m...
```

### `AnnotationPageSchema`

###### Type

```ts
AnnotationPage1Schema
```

### `AnnotationSchema`

###### Type

```ts
Annotation1Schema
```

### `FeaturePropertiesSchema`

###### Type

```ts
Annotation1FeaturePropertiesSchema
```

### `GCPSchema`

###### Type

```ts
GeoreferencedMap2GCPSchema
```

### `GeoreferencedMap`

###### Type

```ts
{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: Array<PartOfItem> | undefined; }; ... 7 more ...; resourceCrs?: { ...; } | undefined; }
```

### `GeoreferencedMapSchema`

###### Type

```ts
GeoreferencedMap2Schema
```

### `GeoreferencedMapsSchema`

###### Type

```ts
GeoreferencedMaps2Schema
```

### `PartOf`

###### Type

```ts
Array<PartOfItem> | undefined
```

### `PartOfItem`

###### Type

```ts
{
  type: string
  id: string
  label?: Record<string, Array<string | number | boolean>> | undefined
} & {partOf?: PartOfItem[]}
```

### `ResourceSchema`

###### Type

```ts
GeoreferencedMap2ResourceSchema
```

### `SvgSelectorSchema`

###### Type

```ts
SvgSelector1Schema
```

### `generateAnnotation(mapOrMaps)`

Generates a Georeference Annotation from a single Georeferenced Map or
an Annotation Page containing multiple Georeference Annotations from an array of Georeferenced Maps.

###### Parameters

* `mapOrMaps` (`unknown`)
  * Single Georeferenced Map, or an array of Georeferenced Maps

###### Returns

Georeference Annotation or Annotation Page (`{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOfItem> | undefined; } | { ...; } | { ...; }; selector: { ...; }; }; ... 5 more ...; motivation?: string | undefined; } | { ....`).

###### Examples

```ts
import fs from 'fs'
import { generateAnnotation } from '@allmaps/annotation'

const map = JSON.parse(fs.readFileSync('./examples/map.example.json'))
const annotation = generateAnnotation(map)
```

### `parseAnnotation(annotation)`

Parses a Georeference Annotation or an Annotation Page containing multiple Georeference Annotations
and returns an array of Georeferenced Maps.

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation or Annotation Page containing multiple Georeference Annotations

###### Returns

Array of maps (`Array<{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: Array<PartOfItem> | undefined; }; ... 7 more ...; resourceCrs?: { ...; } | undefined; }>`).

###### Examples

```ts
import fs from 'fs'
import { parseAnnotation } from '@allmaps/annotation'

const annotation = JSON.parse(fs.readFileSync('./examples/annotation.example.json'))
const maps = parseAnnotation(annotation)
```

### `validateAnnotation(annotation)`

###### Parameters

* `annotation` (`unknown`)

###### Returns

`{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOfItem> | undefined; } | { ...; } | { ...; }; selector: { ...; }; }; ... 5 more ...; motivation?: string | undefined; } | { ....`.

### `validateGeoreferencedMap(mapOrMaps)`

###### Parameters

* `mapOrMaps` (`unknown`)

###### Returns

`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: Array<PartOfItem> | undefined; }; ... 7 more ...; resourceCrs?: { ...; } | undefined; } | Array<{ type: "GeoreferencedMap"; resou...`.
