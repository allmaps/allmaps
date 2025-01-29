# @allmaps/annotation

@allmaps/annotation is a JavaScript module that can generate and parse [Georeference Annotations](https://iiif.io/api/extension/georef/).

A Georeference Annotation is a [Web Annotation](https://www.w3.org/TR/annotation-model/) that stores the metadata needed to [georeference](https://en.wikipedia.org/wiki/Georeferencing) a [IIIF image](https://iiif.io/api/image/3.0/).

A Georeference Annotation contains the following data:

* The [URI of an IIIF Image](https://iiif.io/api/image/3.0/#3-identifier), as well as its dimensions in pixels.
* A list of ground control points (GCPs) that define the mapping between resource coordinates and geospatial coordinates.
* A polygonal resource mask that defines the cartographic part of the image.

Georeference Annotations are a core part of [Allmaps](https://allmaps.org). For example, [Allmaps Viewer](https://viewer.allmaps.org/#data=data%3Atext%2Fx-url%2Chttps%3A%2F%2Fraw.githubusercontent.com%2Fallmaps%2Fannotation%2Fdevelop%2Fexamples%2Fannotation.example.json) can warp maps IIIF maps in the browser, just by loading a georeference annotation.

<!-- TODO: create Observable notebook that allows you to try out this module! -->

## Installation & usage

This is an ESM-only module that works in browsers and Node.js.

Node.js:

First, run `npm install @allmaps/annotation` to add this module to your project.

```js
import { parseAnnotation, generateAnnotation } from '@allmaps/annotation'
```

Browser:

```html
<script type="module">
  import {
    parseAnnotation,
    generateAnnotation
  } from 'https://unpkg.com/@allmaps/annotation?module'
</script>
```

## API

### `Annotation`

###### Type

```ts
{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOf> | undefined; } | { ...; }; selector: { ...; }; }; ... 5 more ...; motivation?: string | undefined; }
```

### `AnnotationPage`

###### Type

```ts
{ type: "AnnotationPage"; items: Array<{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOf> | undefined; } | { ...; }; selector: { ...; }; }; ... 5 more ...; motivation?: str...
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
Map2GCPSchema
```

### `Map`

###### Type

```ts
{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3"; id: string; height?: number | undefined; width?: number | undefined; partOf?: Array<PartOf> | undefined; }; ... 6 more ...; transformation?: any; }
```

### `MapSchema`

###### Type

```ts
Map2Schema
```

### `MapsSchema`

###### Type

```ts
Maps2Schema
```

### `ResourceSchema`

###### Type

```ts
Map2ResourceSchema
```

### `generateAnnotation(mapOrMaps)`

Generates a Georeference Annotation from a single map or
an AnnotationPage containing multiple Georeference Annotations from an array of maps.

###### Parameters

* `mapOrMaps` (`unknown`)
  * Single Georeferenced Map, or an array of Georeferenced Maps

###### Returns

Georeference Annotation (`{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOf> | undefined; } | { ...; }; selector: { ...; }; }; ... 5 more ...; motivation?: string | undefined; } | { ...; }`).

###### Examples

```ts
import fs from 'fs'
import { generateAnnotation } from '@allmaps/annotation'

const map = JSON.parse(fs.readFileSync('./examples/map.example.json'))
const annotation = generateAnnotation(map)
```

### `parseAnnotation(annotation)`

Parses a Georeference Annotation or an AnnotationPage
containing multiple Georeference Annotations and returns an array of maps.

###### Parameters

* `annotation` (`unknown`)
  * Georeference Annotation or AnnotationPage containing multiple Georeference Annotations

###### Returns

Array of maps (`Array<{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3"; id: string; height?: number | undefined; width?: number | undefined; partOf?: Array<PartOf> | undefined; }; ... 6 more ...; transformation?: any; }>`).

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

`{ type: "Annotation"; target: { type: "SpecificResource"; source: { type: "ImageService1" | "ImageService2" | "ImageService3"; height: number; width: number; '@id': string; partOf?: Array<PartOf> | undefined; } | { ...; }; selector: { ...; }; }; ... 5 more ...; motivation?: string | undefined; } | { ...; }`.

### `validateMap(mapOrMaps)`

###### Parameters

* `mapOrMaps` (`unknown`)

###### Returns

`{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3"; id: string; height?: number | undefined; width?: number | undefined; partOf?: Array<PartOf> | undefined; }; ... 6 more ...; transformation?: any; } | Array<{ type: "GeoreferencedMap"; resource: { type: "ImageService1" ...`.
