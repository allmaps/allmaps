# @allmaps/leaflet

Plugin that uses WebGL to show warped IIIF images on a Leaflet map. The plugin works by loading [Georeference Annotations](https://preview.iiif.io/api/georef/extension/georef/).

## How it works

This plugin creates a new class `WarpedMapLayer` which extends and behaves like a `L.Layer`. You can add one or multiple Georeference Annotations to a WarpedMapLayer, and add the WarpedMapLayer to your Leaflet map. This will render all map items contained in the annotations on your Leaflet map!

## Installation

This package works in browsers and in Node.js as an ESM module.

Install with npm:

```sh
npm install @allmaps/leaflet
```

And load using:

```js
import { WarpedMapLayer } from '@allmaps/leaflet'
```

Alternatively, ESM and UMD bundled versions of the code are also provided under `/dist/bundled`. You can load them directly in a HTML script tag using a CDN. They require Leaflet to be loaded as `L`, so place them after loading leaflet.

```html
<script src="https://cdn.jsdelivr.net/npm/@allmaps/leaflet/dist/bundled/allmaps-leaflet-1.9.umd.cjs"></script>
```

When loading as bundled code, the package's functions are available under the `Allmaps` global variable:

```js
// ... (see 'Usage' below)
const warpedMapLayer = new Allmaps.WarpedMapLayer(annotationUrl)
// ...
```


## Usage

Built for Leaflet 1.9, but should work with earlier versions as well.

A first way to add an annotation to a WarpedMapLayer is to specify the annotation or annotationUrl when creating the WarpedMapLayer.

```js
import { WarpedMapLayer } from '@allmaps/leaflet'

// Leaflet map with OSM base layer
const map = L.map('map').setView([42.35921, -71.05882], 13)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

const annotationUrl = 'https://annotations.allmaps.org/images/813b0579711371e2@2c1d7e89d8c309e8'
const warpedMapLayer = new WarpedMapLayer(annotationUrl)

map.addLayer(warpedMapLayer)
```

When adding the WarpedMapLayer to the Leaflet map, the annotation will be added to the WarpedMapLayer and every map item in the annotation will be rendered. For every such map item addition, Leaflet emits a `'warpedmapadded'` event (containing the `mapId` of that map item). You can listen to these events in the classic Leaflet way, e.g.:

```js
map.on('warpedmapadded', (e) => {console.log(e)}, map)
```

When creating a WarpedMapLayer specifying an annotation is optional. It can also be added at a later stage using the functions `addGeoreferenceAnnotation()` or `addGeoreferenceAnnotationByUrl()`. Here's an example of the first using `fetch()` and `then()`.

```js
fetch(annotationUrl)
  .then((response) => response.json())
  .then((annotation) => {
    warpedMapLayer.addGeoreferenceAnnotation(annotation)
  })
```

And here's an example of the later using a custom async function
```js
async function asyncAddGeoreferenceAnnotationByUrl() {
  // ...
  return await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
}
asyncAddGeoreferenceAnnotationByUrl()
```

See `index.html` for an example of a minimal html file that loads a Leaflet maps and adds a Georeference Annotation.

## API
