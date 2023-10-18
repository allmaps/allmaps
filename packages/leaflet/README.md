# @allmaps/leaflet

Plugin that uses WebGL to show warped IIIF images on a Leaflet map. The plugin works by loading [Georeference Annotations](https://preview.iiif.io/api/georef/extension/georef/).

Usage:

```js
import {WarpedMapLayer} from './src/index.ts'

const map = L.map('map').setView([42.35921, -71.05882], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const annotationUrl = 'https://annotations.allmaps.org/images/813b0579711371e2@2c1d7e89d8c309e8' // Boston
const annotationUrl2 = 'https://annotations.allmaps.org/images/25b19ade19654e66@6a6b14487e882f79';
const annotationUrl3 = 'https://allmaps.org/webgl2-preview/west-roxbury.json';

// There are 3 options to add an annotation

// Option 1: Specify annotation or annotationUrl when creating a WarpedMapLayer

const warpedMapLayer = await new WarpedMapLayer(annotationUrl)
map.addLayer(warpedMapLayer)

// Option 2: Fetch an annotation, parse it and add it to a WarpedMapLayer using addGeoreferenceAnnotation().

fetch(annotationUrl2)
.then((response) => response.json())
.then((annotation2) => {
  warpedMapLayer.addGeoreferenceAnnotation(annotation2)
})

// Option 3: Use (the new top-level await and) the specific function to add an annotation using it's URL

await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl3)
```

## API
