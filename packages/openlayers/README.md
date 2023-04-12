# @allmaps/openlayers

Plugin to show warped IIIF images on an OpenLayers map. The plugin works by loading [Georeference Annotations](https://preview.iiif.io/api/georef/extension/georef/).

Tested with OpenLayers 6 and OpenLayers 7.

Usage:

```js
const warpedMapSource = new WarpedMapSource()
const warpedMapLayer = new WarpedMapLayer({
  source: warpedMapSource
})

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    }),
    warpedMapLayer
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-71.0599, 42.3589]),
    zoom: 14
  })
})

const annotationUrl =
  'https://annotations.allmaps.org/images/813b0579711371e2@2c1d7e89d8c309e8'

fetch(annotationUrl)
  .then((response) => response.json())
  .then((annotation) => {
    warpedMapSource.addGeoreferenceAnnotation(annotation)
  })
```
