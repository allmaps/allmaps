# @allmaps/iiif-parser

This is a JavaScript module that parser IIIF [Collections](https://iiif.io/api/presentation/3.0/#51-collection), [Manifests](https://iiif.io/api/presentation/3.0/#52-manifest) and [Images](https://iiif.io/api/image/3.0/#5-image-information). This is a core module of [Allmaps](https://allmaps.org/) and is used in all its apps and components.

*Note: this module parses IIIF data to an intermediate format that is used by Allmaps internally. It does not parse **all** properties defined by the IIIF Image and Presentation APIs, only properties that are needed for Allmaps to function. See the files in the [`src/classes`](src/classes) and [`src/schemas`](src/schemas) directories for details about these proeprties.*

@allmaps/iiif-parser is written in TypeScript and is built using [Zod](https://zod.dev/).

Versions 1, 2 and 3 of the IIIF Image and Presentation APIs are supported.

This module has been tested on a wide variety of IIIF servers. Run `npm test` to run all tests.

## Installation

This is an ESM-only module that works in browsers and Node.js.

Node.js:

First, run `npm install @allmaps/iiif-parser` to add this module to your project.

```js
import { IIIF } from '@allmaps/iiif-parser'
```

Browser:

```html
<script type="module">
  import { IIIF } from 'https://unpkg.com/@allmaps/iiif-parser?module'
</script>
```

## Usage

```js
import { IIIF } from '@allmaps/iiif-parser'

const manifestUrl =
  'https://collections.leventhalmap.org/search/commonwealth:wd376720z/manifest'
const manifest = await fetch(manifestUrl).then((response) => response.json())
const parsedManifest = IIIF.parse(manifest)
console.log(parsedManifest)
```

This will log `parsedManifest` to the console:

```json
{
  "embedded": false,
  "type": "manifest",
  "uri": "https://ark.digitalcommonwealth.org/ark:/50959/wd376720z/manifest",
  "majorVersion": 2,
  "label": {
    "none": [
      "Map of Boston and vicinity showing tracks operated by the Boston Elevated Railway Co., surface lines"
    ]
  },
  "canvases": [
    {
      "type": "canvas",
      "width": 7486,
      "height": 9138,
      "uri": "https://ark.digitalcommonwealth.org/ark:/50959/wd376720z/canvas/wd3767217",
      "label": {
        "none": ["image 1"]
      },
      "image": {
        "embedded": true,
        "type": "image",
        "uri": "https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:wd3767217",
        "majorVersion": 2,
        "supportsAnyRegionAndSize": true,
        "width": 7486,
        "height": 9138
      }
    }
  ],
  "metadata": [
    {
      "label": {
        "none": ["Title"]
      },
      "value": {
        "none": [
          "Map of Boston and vicinity showing tracks operated by the Boston Elevated Railway Co., surface lines"
        ]
      }
    },
    {
      "label": {
        "none": ["Date"]
      },
      "value": {
        "none": ["1898"]
      }
    },
    {
      "label": {
        "none": ["Publisher"]
      },
      "value": {
        "none": ["Boston, Mass : [Geo. H. Walker & Co.]"]
      }
    },
    {
      "label": {
        "none": ["Type of Resource"]
      },
      "value": {
        "none": ["Cartographic"]
      }
    },
    {
      "label": {
        "none": ["Format"]
      },
      "value": {
        "none": ["Maps"]
      }
    },
    {
      "label": {
        "none": ["Language"]
      },
      "value": {
        "none": ["English"]
      }
    },
    {
      "label": {
        "none": ["Subjects"]
      },
      "value": {
        "none": [
          "Boston Elevated Railway Company",
          "Street-railroads--Massachusetts--Boston--Maps",
          "Boston (Mass.)--Maps",
          "Massachusetts--Maps"
        ]
      }
    },
    {
      "label": {
        "none": ["Location"]
      },
      "value": {
        "none": ["Boston Public Library"]
      }
    },
    {
      "label": {
        "none": ["Collection (local)"]
      },
      "value": {
        "none": ["Norman B. Leventhal Map Center Collection"]
      }
    },
    {
      "label": {
        "none": ["Identifier"]
      },
      "value": {
        "none": [
          "https://ark.digitalcommonwealth.org/ark:/50959/wd376720z",
          "06_01_003041",
          "G3764.B6P33 1898 .M3",
          "39999058997337"
        ]
      }
    },
    {
      "label": {
        "none": ["Terms of Use"]
      },
      "value": {
        "none": [
          "No known copyright restrictions.",
          "No known restrictions on use."
        ]
      }
    }
  ]
}
```

You can also call the `parse` function on a specific IIIF class:

```js
import { Image } from '@allmaps/iiif-parser'

const imageUrl =
  'https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:wd3767217'
const image = await fetch(`${imageUrl}/info.json`).then((response) =>
  response.json()
)
const parsedImage = Image.parse(image)
console.log(parsedImage)
```

This will log `parsedImage` to the console:

```json
{
  "embedded": false,
  "type": "image",
  "uri": "https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:wd3767217",
  "majorVersion": 2,
  "supportsAnyRegionAndSize": true,
  "width": 7486,
  "height": 9138,
  "tileZoomLevels": [
    {
      "scaleFactor": 1,
      "width": 1024,
      "height": 1024,
      "originalWidth": 1024,
      "originalHeight": 1024,
      "columns": 8,
      "rows": 9
    },
    {
      "scaleFactor": 2,
      "width": 1024,
      "height": 1024,
      "originalWidth": 2048,
      "originalHeight": 2048,
      "columns": 4,
      "rows": 5
    },
    {
      "scaleFactor": 4,
      "width": 1024,
      "height": 1024,
      "originalWidth": 4096,
      "originalHeight": 4096,
      "columns": 2,
      "rows": 3
    },
    {
      "scaleFactor": 8,
      "width": 1024,
      "height": 1024,
      "originalWidth": 8192,
      "originalHeight": 8192,
      "columns": 1,
      "rows": 2
    },
    {
      "scaleFactor": 16,
      "width": 1024,
      "height": 1024,
      "originalWidth": 16384,
      "originalHeight": 16384,
      "columns": 1,
      "rows": 1
    },
    {
      "scaleFactor": 32,
      "width": 1024,
      "height": 1024,
      "originalWidth": 32768,
      "originalHeight": 32768,
      "columns": 1,
      "rows": 1
    },
    {
      "scaleFactor": 64,
      "width": 1024,
      "height": 1024,
      "originalWidth": 65536,
      "originalHeight": 65536,
      "columns": 1,
      "rows": 1
    }
  ],
  "sizes": [
    {
      "width": 117,
      "height": 143
    },
    {
      "width": 234,
      "height": 286
    },
    {
      "width": 468,
      "height": 571
    },
    {
      "width": 936,
      "height": 1142
    },
    {
      "width": 1872,
      "height": 2285
    },
    {
      "width": 3743,
      "height": 4569
    },
    {
      "width": 7486,
      "height": 9138
    }
  ]
}
```

You can check if a parsed IIIF resource object is of a specific class by using the `instanceof` operator or checking the `type` property:

```ts
import { IIIF } from '@allmaps/iiif-parser'

const url =
  'https://collections.leventhalmap.org/search/commonwealth:wd376720z/manifest'
const iiif = await fetch(url).then((response) => response.json())
const parsedIiif = IIIF.parse(manifest)

if (parsedIiif.type === 'manifest') {
  console.log('This is a IIIF Manifest!')
}
```

## CLI

Parsing IIIF resources is also possible using the [Allmaps CLI](https://github.com/allmaps/allmaps/tree/main/apps/cli).

For example:

```sh
curl https://collections.leventhalmap.org/search/commonwealth:wd376720z/manifest | allmaps iiif parse
```

## License

MIT

## API

### `new Canvas(parsedCanvas)`

###### Parameters

* `parsedCanvas` (`{ '@id': string; width: number; height: number; '@type': "sc:Canvas"; images: Array<{ resource: { service: { '@id': string; profile: string | ValidImage2ProfileArray; '@context'?: string | undefined; width?: number | undefined; height?: number | undefined; '@type'?: "ImageService2" | ... 2 more ... | undefined; } | ...`)

###### Returns

`Canvas`.

### `Canvas#annotations?`

###### Type

```ts
Array<{id: string; type: 'AnnotationPage'}>
```

### `Canvas#description?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `Canvas#height`

###### Type

```ts
number
```

### `Canvas#homepage?`

###### Type

```ts
Array<{
  id: string
  type?: string
  label?: LanguageString
  format?: string
  language?: string | string[]
}>
```

### `Canvas#image`

###### Type

```ts
Image | EmbeddedImage
```

### `Canvas#label?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `Canvas#metadata?`

###### Type

```ts
Array<MetadataItem>
```

### `Canvas#navDate?`

###### Type

```ts
Date
```

### `Canvas#navPlace?`

###### Type

```ts
object
```

### `Canvas#rendering?`

###### Type

```ts
Array<{
  id: string
  type?: string
  label?: LanguageString
  format?: string
}>
```

### `Canvas#requiredStatement?`

###### Type

```ts
{label: LanguageString; value: LanguageString}
```

### `Canvas#seeAlso?`

###### Type

```ts
Array<{id: string; type?: string; format?: string; profile?: string}>
```

### `Canvas#summary?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `Canvas#thumbnail?`

###### Type

```ts
Array<{
  id: string
  type?: string
  format?: string
  width?: number
  height?: number
}>
```

### `Canvas#type`

###### Type

```ts
CanvasTypeString
```

### `Canvas#uri`

###### Type

```ts
string
```

### `Canvas#width`

###### Type

```ts
number
```

### `new Collection(parsedCollection)`

###### Parameters

* `parsedCollection` (`Collection2 | Collection3`)

###### Returns

`Collection`.

###### Extends

* `EmbeddedCollection`

### `Collection#annotations?`

###### Type

```ts
Array<{id: string; type: 'AnnotationPage'}>
```

### `Collection#canvases`

###### Type

```ts
Array<Canvas>
```

### `Collection#description?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `Collection#embedded`

###### Type

```ts
false
```

### `Collection#fetchAll(options)`

###### Parameters

* `options?` (`Partial<FetchNextOptions> | undefined`)

###### Returns

`Promise<Array<FetchNextResults<Image | Manifest | Collection>>>`.

### `Collection#fetchNext(options, depth)`

###### Parameters

* `options?` (`Partial<FetchNextOptions> | undefined`)
* `depth` (`number | undefined`)

###### Returns

`AsyncGenerator<
  FetchNextResults<Image | Manifest | Collection>,
  void,
  void >`.

### `Collection#homepage?`

###### Type

```ts
Array<{
  id: string
  type?: string
  label?: LanguageString
  format?: string
  language?: string | string[]
}>
```

### `Collection#images`

###### Type

```ts
Array<Image | EmbeddedImage>
```

### `Collection#items`

###### Type

```ts
Array<never>
```

### `Collection#metadata?`

###### Type

```ts
Array<MetadataItem>
```

### `Collection#navDate?`

###### Type

```ts
Date
```

### `Collection#navPlace?`

###### Type

```ts
object
```

### `Collection#rendering?`

###### Type

```ts
Array<{
  id: string
  type?: string
  label?: LanguageString
  format?: string
}>
```

### `Collection#requiredStatement?`

###### Type

```ts
{label: LanguageString; value: LanguageString}
```

### `Collection#seeAlso?`

###### Type

```ts
Array<{id: string; type?: string; format?: string; profile?: string}>
```

### `Collection#summary?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `Collection#thumbnail?`

###### Type

```ts
Array<{
  id: string
  type?: string
  format?: string
  width?: number
  height?: number
}>
```

### `Collection.parse(iiifCollection, majorVersion)`

Parses a IIIF Collection and returns a [Collection](#collection) containing the parsed version

###### Parameters

* `iiifCollection` (`unknown`)
  * Source data of IIIF Collection
* `majorVersion` (`MajorVersion | null | undefined`)
  * IIIF API version of Collection. If not provided, it will be determined automatically

###### Returns

Parsed IIIF Collection (`Collection`).

### `new EmbeddedCollection(parsedCollection)`

###### Parameters

* `parsedCollection` (`Collection2 | Collection3 | EmbeddedCollectionType`)

###### Returns

`EmbeddedCollection`.

### `EmbeddedCollection#embedded`

###### Type

```ts
true
```

### `EmbeddedCollection#label?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `EmbeddedCollection#majorVersion`

###### Type

```ts
1 | 2 | 3
```

### `EmbeddedCollection#type`

###### Type

```ts
CollectionTypeString
```

### `EmbeddedCollection#uri`

###### Type

```ts
string
```

### `EmbeddedCollection.parse(iiifCollection, majorVersion)`

Parses a IIIF Collection and returns a [Collection](#collection) containing the parsed version

###### Parameters

* `iiifCollection` (`unknown`)
  * Source data of IIIF Collection
* `majorVersion` (`MajorVersion | null | undefined`)
  * IIIF API version of Collection. If not provided, it will be determined automatically

###### Returns

Parsed IIIF Collection (`Collection`).

### `new EmbeddedImage(parsedImage)`

###### Parameters

* `parsedImage` (`{ '@context': "http://library.stanford.edu/iiif/image-api/1.1/context.json"; '@id': string; width: number; height: number; profile?: string | undefined; scale_factors?: Array<number> | undefined; tile_width?: number | undefined; tile_height?: number | undefined; } | { ...; } | { ...; }`)

###### Returns

`EmbeddedImage`.

### `EmbeddedImage#embedded`

###### Type

```ts
true
```

### `EmbeddedImage#getImageRequest(size, mode)`

###### Parameters

* `size` (`{width: number; height: number}`)
* `mode` (`Fit | undefined`)

###### Returns

`ImageRequest | Array<Array<ImageRequest>>`.

### `EmbeddedImage#getImageUrl(imageRequest)`

Generates a IIIF Image API URL for the requested region and size

###### Parameters

* `imageRequest` (`{region?: Region; size?: SizeObject}`)
  * Image request object containing the desired region and size of the requested image

###### Returns

Image API URL that can be used to fetch the requested image (`string`).

### `EmbeddedImage#height`

###### Type

```ts
number
```

### `EmbeddedImage#majorVersion`

###### Type

```ts
1 | 2 | 3
```

### `EmbeddedImage#maxArea`

###### Type

```ts
number | undefined
```

### `EmbeddedImage#maxHeight`

###### Type

```ts
number | undefined
```

### `EmbeddedImage#maxWidth`

###### Type

```ts
number | undefined
```

### `EmbeddedImage#supportsAnyRegionAndSize`

###### Type

```ts
boolean
```

### `EmbeddedImage#type`

###### Type

```ts
ImageTypeString
```

### `EmbeddedImage#uri`

###### Type

```ts
string
```

### `EmbeddedImage#width`

###### Type

```ts
number
```

### `new EmbeddedManifest(parsedManifest)`

###### Parameters

* `parsedManifest` (`{ '@id': string; '@type': "sc:Manifest"; sequences: Array<{ canvases: [{ '@id': string; width: number; height: number; '@type': "sc:Canvas"; images: Array<{ resource: { service: { '@id': string; profile: string | ValidImage2ProfileArray; '@context'?: string | undefined; width?: number | undefined; height?: number | ...`)

###### Returns

`EmbeddedManifest`.

### `EmbeddedManifest#embedded`

###### Type

```ts
true
```

### `EmbeddedManifest#label?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `EmbeddedManifest#majorVersion`

###### Type

```ts
1 | 2 | 3
```

### `EmbeddedManifest#type`

###### Type

```ts
ManifestTypeString
```

### `EmbeddedManifest#uri`

###### Type

```ts
string
```

### `new IIIF()`

Base class that contains a static parse function for IIIF resources

###### Parameters

There are no parameters.

###### Returns

`IIIF`.

### `IIIF.parse(iiifResource, majorVersion)`

Parses as IIIF resource and returns a class containing the parsed version

###### Parameters

* `iiifResource` (`unknown`)
  * Source data of a IIIF resource
* `majorVersion` (`MajorVersion | null | undefined`)
  * IIIF API version of resource. If not provided, it will be determined automatically

###### Returns

Parsed IIIF resource (`Image | Manifest | Collection`).

### `new Image(parsedImage)`

###### Parameters

* `parsedImage` (`{ '@context': "http://library.stanford.edu/iiif/image-api/1.1/context.json"; '@id': string; width: number; height: number; profile?: string | undefined; scale_factors?: Array<number> | undefined; tile_width?: number | undefined; tile_height?: number | undefined; } | { ...; } | { ...; }`)

###### Returns

`Image`.

###### Extends

* `EmbeddedImage`

### `Image#embedded`

###### Type

```ts
false
```

### `Image#getImageRequest(size, mode)`

Returns a Image request object for the requested region and size

###### Parameters

* `size` (`{width: number; height: number}`)
  * Size of the requested thumbnail
* `mode` (`Fit | undefined`)
  * Desired fit mode of the requested thumbnail

###### Returns

Image request object that can be used to fetch the requested thumbnail (`ImageRequest | Array<Array<ImageRequest>>`).

### `Image#getTileImageRequest(zoomLevel, column, row)`

Returns a Image request object for a tile with the requested zoom level, column, and row

###### Parameters

* `zoomLevel` (`{
    scaleFactor: number
    width: number
    height: number
    originalWidth: number
    originalHeight: number
    columns: number
    rows: number
  }`)
  * Desired zoom level of the requested tile
* `column` (`number`)
  * Column of the requested tile
* `row` (`number`)
  * Row of the requested tile

###### Returns

Image request object that can be used to fetch the requested tile (`{region?: Region; size?: SizeObject}`).

### `Image#sizes?`

###### Type

```ts
Array<SizeObject>
```

### `Image#tileZoomLevels`

###### Type

```ts
Array<TileZoomLevel>
```

### `Image.parse(iiifImage, majorVersion)`

Parses a IIIF image and returns a [Image](#image) containing the parsed version

###### Parameters

* `iiifImage` (`unknown`)
  * Source data of IIIF Image
* `majorVersion` (`MajorVersion | null | undefined`)
  * IIIF API version of Image. If not provided, it will be determined automatically

###### Returns

Parsed IIIF Image (`Image`).

### `ImageRequest`

###### Fields

* `region?` (`{x: number; y: number; width: number; height: number}`)
* `size?` (`{width: number; height: number}`)

### `LanguageString`

###### Fields

* `[language: string]` (`Array<string>`)

### `MajorVersion`

###### Type

```ts
1 | 2 | 3
```

### `new Manifest(parsedManifest)`

###### Parameters

* `parsedManifest` (`{ '@id': string; '@type': "sc:Manifest"; sequences: Array<{ canvases: [{ '@id': string; width: number; height: number; '@type': "sc:Canvas"; images: Array<{ resource: { service: { '@id': string; profile: string | ValidImage2ProfileArray; '@context'?: string | undefined; width?: number | undefined; height?: number | ...`)

###### Returns

`Manifest`.

###### Extends

* `EmbeddedManifest`

### `Manifest#annotations?`

###### Type

```ts
Array<{id: string; type: 'AnnotationPage'}>
```

### `Manifest#canvases`

###### Type

```ts
Array<never>
```

### `Manifest#description?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `Manifest#embedded`

###### Type

```ts
false
```

### `Manifest#fetchAll(fetchFn)`

###### Parameters

* `fetchFn` (`  | ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
    | undefined`)

###### Returns

`Promise<Array<FetchNextResults<Image>>>`.

### `Manifest#fetchImageByUri(imageUri, fetchFn)`

###### Parameters

* `imageUri` (`string`)
* `fetchFn` (`  | ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
    | undefined`)

###### Returns

`Promise<Image | undefined>`.

### `Manifest#fetchNext(fetchFn, depth)`

###### Parameters

* `fetchFn` (`  | ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
    | undefined`)
* `depth` (`number | undefined`)

###### Returns

`AsyncGenerator<FetchNextResults<Image>, void, void>`.

### `Manifest#homepage?`

###### Type

```ts
Array<{
  id: string
  type?: string
  label?: LanguageString
  format?: string
  language?: string | string[]
}>
```

### `Manifest#images`

###### Type

```ts
Array<Image | EmbeddedImage>
```

### `Manifest#metadata?`

###### Type

```ts
Array<MetadataItem>
```

### `Manifest#navDate?`

###### Type

```ts
Date
```

### `Manifest#navPlace?`

###### Type

```ts
object
```

### `Manifest#rendering?`

###### Type

```ts
Array<{
  id: string
  type?: string
  label?: LanguageString
  format?: string
}>
```

### `Manifest#requiredStatement?`

###### Type

```ts
{label: LanguageString; value: LanguageString}
```

### `Manifest#seeAlso?`

###### Type

```ts
Array<{id: string; type?: string; format?: string; profile?: string}>
```

### `Manifest#summary?`

###### Type

```ts
{[language: string]: Array<string>}
```

### `Manifest#thumbnail?`

###### Type

```ts
Array<{
  id: string
  type?: string
  format?: string
  width?: number
  height?: number
}>
```

### `Manifest.parse(iiifManifest, majorVersion)`

Parses a IIIF resource and returns a [Manifest](#manifest) containing the parsed version

###### Parameters

* `iiifManifest` (`unknown`)
  * Source data of IIIF Manifest
* `majorVersion` (`MajorVersion | null | undefined`)
  * IIIF API version of Manifest. If not provided, it will be determined automatically

###### Returns

Parsed IIIF Manifest (`Manifest`).

### `Metadata`

###### Type

```ts
Array<MetadataItem>
```

### `ProfileProperties`

###### Fields

* `maxArea?` (`number`)
* `maxHeight?` (`number`)
* `maxWidth?` (`number`)
* `supportsAnyRegionAndSize` (`boolean`)

### `Region`

###### Fields

* `height` (`number`)
* `width` (`number`)
* `x` (`number`)
* `y` (`number`)

### `Size`

Two numbers indicating the size of a Bbox as \[width, height] or \[xSize, ySize] (`[number, number]`).
Alternatively, two numbers indicating the minimum and maximum of, for example, an array of numbers
Alternatively, two numbers indicating the dimensions of a matrix: rows, cols (which is a different handedness!)

### `TileZoomLevel`

###### Fields

* `columns` (`number`)
* `height` (`number`)
* `originalHeight` (`number`)
* `originalWidth` (`number`)
* `rows` (`number`)
* `scaleFactor` (`number`)
* `width` (`number`)

### `Tileset`

###### Type

```ts
{
  width: number
  scaleFactors: Array<number>
  height?: number | undefined
}
```
