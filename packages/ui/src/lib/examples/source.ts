import type {
  ExampleBounds,
  ExampleLibrary,
  ExampleSettings,
  ExampleViewMode,
  ExampleCode,
  MapExampleProps
} from './types.js'

export { exampleLibraries } from './libraries.ts'

export const transformations = [
  { value: 'annotation', label: 'From annotation' },
  { value: 'polynomial1', label: 'Polynomial (order 1)' },
  { value: 'helmert', label: 'Helmert' },
  { value: 'thinPlateSpline', label: 'Thin plate spline' }
] as const

export const viewModes = [
  { value: 'fit', label: 'Fit after loading' },
  { value: 'bounds', label: 'Known bounds' },
  { value: 'list', label: 'WarpedMapList' }
] as const

export function validateAnnotationUrl(value: string) {
  const url = new URL(value)
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'Enter an HTTP or HTTPS annotation URL without credentials.'
    )
  }
  return url.href
}

function quote(value: string) {
  return `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')}'`
}

/** A short, standalone example using the settings selected in the map. */
export function exampleSource(
  settings: ExampleSettings,
  library: ExampleLibrary,
  bounds?: ExampleBounds,
  viewMode: ExampleViewMode = 'fit'
) {
  if (viewMode === 'bounds' && !bounds) return '// Loading map bounds…\n'

  const listMode = viewMode === 'list'
  const annotationDeclaration = `const annotationUrl =\n  ${quote(settings.annotationUrl)}`
  const listImport = listMode
    ? "import { WarpedMapList } from '@allmaps/render'\n"
    : ''
  const fixedBounds = bounds
    ? `[${bounds.map((value) => Number(value.toFixed(7))).join(', ')}]`
    : ''
  const listOptions =
    settings.transformation === 'annotation'
      ? ''
      : `{ transformationType: ${quote(settings.transformation)} }`
  const prelude = listMode
    ? `${annotationDeclaration}
const response = await fetch(annotationUrl)
if (!response.ok) throw new Error('Could not load the annotation')

const annotation = await response.json()
const warpedMapList = new WarpedMapList(${listOptions})
warpedMapList.addGeoreferenceAnnotation(annotation)

const bounds = warpedMapList.getMapsBbox()
if (!bounds) throw new Error('The annotation contains no maps')

`
    : viewMode === 'bounds' && library !== 'MapLibre'
      ? `const bounds = ${fixedBounds}\n\n`
      : ''
  const overrides = [
    ...(settings.opacity === 1
      ? []
      : [`warpedMapLayer.setOpacity(${settings.opacity})`]),
    ...(settings.transformation === 'annotation' || listMode
      ? []
      : [
          `warpedMapLayer.setLayerTransformationType(${quote(settings.transformation)})`
        ])
  ]
  const overrideSource = overrides.length ? `\n${overrides.join('\n')}` : ''
  const layerOptions = listMode ? '{ warpedMapList }' : ''
  const load = listMode
    ? ''
    : `\n${annotationDeclaration}\nawait warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)\n`

  if (library === 'MapLibre') {
    const initialBounds =
      viewMode === 'fit'
        ? ''
        : `\n  bounds: ${listMode ? 'bounds' : fixedBounds},\n  fitBoundsOptions: { padding: 30 },`
    return `import { Map, setWorkerUrl } from 'maplibre-gl'
import { WarpedMapLayer } from '@allmaps/maplibre'
${listImport}import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)

${prelude}const map = new Map({
  container: 'map',${initialBounds}
  style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  maxPitch: 0
})

const warpedMapLayer = new WarpedMapLayer(${layerOptions})
${listMode ? '' : `\n${annotationDeclaration}\n`}
map.on('load', ${listMode ? '' : 'async '}() => {
  map.addLayer(warpedMapLayer)${listMode ? '' : '\n  await warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)'}${overrides.length ? `\n${overrides.map((line) => `  ${line}`).join('\n')}` : ''}${viewMode === 'fit' ? '\n\n  const bounds = warpedMapLayer.getBounds()\n  if (bounds) map.fitBounds(bounds, { padding: 30 })' : ''}
})
`
  }

  if (library === 'Leaflet') {
    return `import * as L from 'leaflet'
import { WarpedMapLayer } from '@allmaps/leaflet'
${listImport}import 'leaflet/dist/leaflet.css'

${prelude}const map = L.map('map', {
  center: [0, 0],
  zoom: 2,
  zoomSnap: 0,
  zoomAnimationThreshold: 1
})
${viewMode === 'fit' ? '' : '\nmap.fitBounds([[bounds[1], bounds[0]], [bounds[3], bounds[2]]], {\n  padding: [30, 30]\n})\n'}
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

const warpedMapLayer = new WarpedMapLayer(undefined${listMode ? ', { warpedMapList }' : ''}).addTo(map)
${load}${overrideSource}${viewMode === 'fit' ? '\n\nconst bounds = warpedMapLayer.getBounds()\nif (bounds) map.fitBounds(bounds, { padding: [30, 30] })' : ''}
`
  }

  const preparedView =
    viewMode === 'fit'
      ? ''
      : `const container = document.getElementById('map')
if (!container) throw new Error('Map container not found')

const view = new View()
view.fit(transformExtent(bounds, 'EPSG:4326', 'EPSG:3857'), {
  size: [container.clientWidth, container.clientHeight],
  padding: [30, 30, 30, 30]
})

`
  return `import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import OSM from 'ol/source/OSM.js'
${viewMode === 'fit' ? '' : "import { transformExtent } from 'ol/proj.js'\n"}import { WarpedMapLayer } from '@allmaps/openlayers'
${listImport}import 'ol/ol.css'

${prelude}${preparedView}const warpedMapLayer = new WarpedMapLayer(${layerOptions})
const map = new Map({
  target: ${viewMode === 'fit' ? "'map'" : 'container'},
  layers: [new TileLayer({ source: new OSM() }), warpedMapLayer],
  view: ${viewMode === 'fit' ? 'new View({ center: [0, 0], zoom: 2 })' : 'view'}
})
${load}${overrideSource}${viewMode === 'fit' ? "\n\nconst bounds = warpedMapLayer.getBbox({\n  projection: { definition: 'EPSG:3857' }\n})\nif (bounds) map.getView().fit(bounds, { padding: [30, 30, 30, 30] })" : ''}
`
}

/** Source for both the initial page render and updates from the map controls. */
export function exampleCode(
  {
    annotationUrl,
    opacity = 1,
    transformation = 'annotation',
    viewMode = 'fit',
    height = 400
  }: MapExampleProps,
  library: ExampleLibrary,
  packages: string,
  bounds?: ExampleBounds
): ExampleCode {
  return {
    javascript: exampleSource(
      { annotationUrl, opacity, transformation },
      library,
      bounds,
      viewMode
    ),
    html: `<div id="map" style="height: ${height}px"></div>`,
    bash: `pnpm add ${packages}${viewMode === 'list' ? ' @allmaps/render' : ''}`
  }
}
