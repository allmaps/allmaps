import { writable, derived } from 'svelte/store'

import { WarpedMapSource } from '@allmaps/openlayers'

import type Map from 'ol/Map.js'

type XYZLayer = {
  url: string
  attribution: string
}

const defaultXYZLayers: XYZLayer[] = [
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
]

export const xyzLayers = writable<XYZLayer[]>(defaultXYZLayers)

export const xyzLayerIndex = writable(0)

export const xyzLayer = derived(
  [xyzLayers, xyzLayerIndex],
  ([$xyzLayers, $xyzLayerIndex]) => $xyzLayers[$xyzLayerIndex]
)

export const ol = writable<Map | undefined>()

export const warpedMapSource = writable<WarpedMapSource>(new WarpedMapSource())
