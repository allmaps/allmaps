import { writable, derived, get } from 'svelte/store'

import {
  WarpedMapSource,
  WarpedMapLayer,
  WarpedMapEvent,
  WarpedMapEventType
} from '@allmaps/openlayers'
import type { Map as Georef } from '@allmaps/annotation'

import Map from 'ol/Map.js'
import VectorSource from 'ol/source/Vector.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import XYZ from 'ol/source/XYZ.js'
import View from 'ol/View.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Select from 'ol/interaction/Select.js'
import { click } from 'ol/events/condition.js'
import {
  DblClickDragZoom,
  defaults as defaultInteractions
} from 'ol/interaction.js'

import IIIFLayer from '$lib/shared/IIIFLayer.js'

import {
  selectedPolygonStyle,
  invisiblePolygonStyle,
  outlinePolygonStyle
} from '$lib/shared/openlayers.js'

import { view } from '$lib/shared/stores/view.js'

import { mapsById, setRemoveBackgroundColor } from '$lib/shared/stores/maps.js'

import { detectBackgroundColor } from '$lib/shared/wrappers/detect-background-color.js'

import type { MapIDOrError } from '$lib/shared/types.js'
import type { FeatureLike } from 'ol/Feature.js'
import type { OrderFunction } from 'ol/render.js'

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

// Image Information Cache

export let imageInfoCache: Cache | undefined

export async function createImageInfoCache() {
  imageInfoCache = await caches.open('new-cache')
  mapWarpedMapSource.setImageInfoCache(imageInfoCache)
}

// Map view

export let mapOl: Map | undefined
export let mapTileSource: XYZ | undefined
export let mapTileLayer: TileLayer<XYZ> | undefined
export const mapWarpedMapSource = new WarpedMapSource()
export let mapWarpedMapLayer: WarpedMapLayer | undefined
export const mapVectorSource = new VectorSource()
export let mapVectorLayer: VectorLayer<VectorSource> | undefined
export let mapSelect: Select | undefined

function mapVectorLayerOrderFunction(
  feature1: FeatureLike,
  feature2: FeatureLike
): number | null {
  const mapId1 = feature1.getId() as string
  const mapId2 = feature2.getId() as string

  if (mapId1 && mapId2) {
    const zIndex1 = mapWarpedMapSource.getMapZIndex(mapId1)
    const zIndex2 = mapWarpedMapSource.getMapZIndex(mapId2)

    if (zIndex1 !== undefined && zIndex2 !== undefined) {
      return zIndex1 - zIndex2
    }
  }

  return null
}

async function mapWarpedMapLayerFirstTileLoaded(event: Event) {
  if (event instanceof WarpedMapEvent) {
    const { mapId, tileUrl } = event.data as { mapId: string; tileUrl: string }

    const $mapsById = get(mapsById)
    const sourceMap = $mapsById.get(mapId)

    if (sourceMap && !sourceMap.renderOptions.removeBackground.color) {
      // TODO: Consider using ...tileCache.getCachedTile(tileUrl)
      const cachedTile =
        mapWarpedMapLayer?.renderer.tileCache.getCacheableTile(tileUrl)
      const imageBitmap = cachedTile?.imageBitmap

      if (imageBitmap) {
        const backgroundColor = await detectBackgroundColor(
          sourceMap.map,
          imageBitmap
        )

        if (backgroundColor) {
          setRemoveBackgroundColor(mapId, backgroundColor)
        }
      } else {
        console.warn(`Cannot detect background color for map ${mapId}`)
      }
    }
  }
}

export function createMapOl() {
  // TODO: set attribution
  mapTileSource = new XYZ({
    url: defaultXYZLayers[0].url,
    maxZoom: 19
  })

  mapTileLayer = new TileLayer({
    source: mapTileSource
  })

  mapWarpedMapLayer = new WarpedMapLayer({ source: mapWarpedMapSource })

  if (mapWarpedMapLayer) {
    // TODO: emit this event directly from WarpedMapLayer?
    mapWarpedMapLayer.renderer.tileCache.addEventListener(
      WarpedMapEventType.FIRSTMAPTILELOADED,
      mapWarpedMapLayerFirstTileLoaded
    )

    mapVectorLayer = new VectorLayer({
      source: mapVectorSource,
      style: invisiblePolygonStyle,
      renderOrder: mapVectorLayerOrderFunction as OrderFunction
    })

    mapOl = new Map({
      interactions: defaultInteractions().extend([new DblClickDragZoom()]),
      layers: [mapTileLayer, mapWarpedMapLayer, mapVectorLayer],
      controls: [],
      view: new View({
        maxZoom: 24,
        zoom: 12
      }),
      keyboardEventTarget: document
    })

    mapSelect = new Select({
      condition: click,
      style: selectedPolygonStyle
    })

    mapOl.addInteraction(mapSelect)
  }
}

export const mapVectorLayerOutlinesVisible = writable(false)

mapVectorLayerOutlinesVisible.subscribe(($mapVectorLayerOutlinesVisible) => {
  if (mapVectorLayer) {
    if ($mapVectorLayerOutlinesVisible) {
      mapVectorLayer.setStyle(outlinePolygonStyle)
    } else {
      mapVectorLayer.setStyle(invisiblePolygonStyle)
    }
  }
})

// Image view

export let imageOl: Map | undefined
export const imageVectorSource = new VectorSource()
export let imageVectorLayer: VectorLayer<VectorSource> | undefined
export let imageIiifLayer: IIIFLayer | undefined

export function createImageOl() {
  imageVectorLayer = new VectorLayer({
    source: imageVectorSource,
    style: selectedPolygonStyle
  })

  imageIiifLayer = new IIIFLayer()

  imageOl = new Map({
    interactions: defaultInteractions().extend([new DblClickDragZoom()]),
    controls: [],
    layers: [imageIiifLayer, imageVectorLayer],
    keyboardEventTarget: document
  })
}

export const ol = derived(view, ($view) => {
  if ($view === 'map') {
    return mapOl
  } else if ($view === 'image') {
    return imageOl
  }
})

// Exported functions

export function showMap(mapId: string) {
  if (!mapWarpedMapSource.isMapVisible(mapId)) {
    mapWarpedMapSource.showMap(mapId)
    addMapToVectorSource(mapId)
  }
}

export function hideMap(mapId: string) {
  if (mapWarpedMapSource.isMapVisible(mapId)) {
    mapWarpedMapSource.hideMap(mapId)
    removeMapFromVectorSource(mapId)
  }
}

export async function addMap(map: Georef): Promise<MapIDOrError> {
  const mapIdOrError = await mapWarpedMapSource.addGeoreferencedMap(map)
  if (typeof mapIdOrError === 'string') {
    const mapId = mapIdOrError
    addMapToVectorSource(mapId)
  }

  return mapIdOrError
}

export async function removeMap(map: Georef) {
  const mapIdOrError = await mapWarpedMapSource.removeGeoreferencedMap(map)
  if (typeof mapIdOrError === 'string') {
    const mapId = mapIdOrError
    removeMapFromVectorSource(mapId)
  }

  return mapIdOrError
}

export function addMapToVectorSource(mapId: string) {
  const warpedMap = mapWarpedMapSource.getWarpedMap(mapId)
  if (warpedMap) {
    const geoMask = warpedMap.geoMask
    const feature = new GeoJSON().readFeature(geoMask)
    feature.setId(warpedMap.mapId)

    if (!mapVectorSource.hasFeature(feature)) {
      mapVectorSource.addFeature(feature)
    }
  }
}

export function removeMapFromVectorSource(mapId: string) {
  const feature = mapVectorSource.getFeatureById(mapId)
  if (feature) {
    mapVectorSource.removeFeature(feature)
  }
}
