import type { Point } from '@allmaps/types'

export function generateLeafletExample(
  annotationUrl: string,
  center: Point,
  zoom: number
) {
  return `import L from 'leaflet'
import { WarpedMapLayer } from '@allmaps/leaflet'

const map = L.map('map', {
  center: [${center[1]}, ${center[0]}],
  zoom: ${zoom},
  // Zoom animations for more than one zoom level are
  // currently not supported by the Allmaps plugin for Leafet
  zoomAnimationThreshold: 1
})

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">' +
    'OpenStreetMap</a> contributors'
}).addTo(map)

const annotationUrl =
  '${annotationUrl}'
const warpedMapLayer = new WarpedMapLayer(annotationUrl)
  .addTo(map)`
}

export function generateMapLibreExample(
  annotationUrl: string,
  center: Point,
  zoom: number
) {
  return `import { Map } from 'maplibre-gl'
import { WarpedMapLayer } from '@allmaps/maplibre'

const map = new Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  center: [${center[0]}, ${center[1]}],
  zoom: ${zoom},
  // These options are required for the Allmaps plugin:
  maxPitch: 0,
  preserveDrawingBuffer: true
})

const annotationUrl =
  '${annotationUrl}'
const warpedMapLayer = new WarpedMapLayer()

map.on('load', () => {
  map.addLayer(warpedMapLayer)
  warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
})`
}

export function generateOpenLayersExample(
  annotationUrl: string,
  center: Point,
  zoom: number
) {
  return `import ol from 'ol'
import { WarpedMapLayer } from '@allmaps/openlayers'

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([${center[0]}, ${center[1]}]),
    zoom: ${zoom}
  })
})

const warpedMapLayer = new WarpedMapLayer()
const annotationUrl =
  '${annotationUrl}'
map.addLayer(warpedMapLayer)
warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)`
}
