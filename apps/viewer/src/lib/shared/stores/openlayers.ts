import { writable, derived, get } from 'svelte/store'

import {
  IIIFLayer,
  WarpedMapSource,
  WarpedMapLayer,
  WarpedMapEvent,
  WarpedMapEventType
} from '@allmaps/openlayers'

import Map from 'ol/Map.js'
import { Vector as VectorSource } from 'ol/source'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import XYZ from 'ol/source/XYZ.js'
import View from 'ol/View.js'
import { GeoJSON } from 'ol/format'
import Select from 'ol/interaction/Select.js'
import { click } from 'ol/events/condition.js'

import {
  selectedPolygonStyle,
  invisiblePolygonStyle
} from '$lib/shared/openlayers.js'

import { view } from '$lib/shared/stores/view.js'

import { mapsById, setRemoveBackgroundColor } from '$lib/shared/stores/maps.js'

import type { ViewerMap } from '$lib/shared/types.js'
import type FeatureLike from 'ol/Feature'
import type { OrderFunction } from 'ol/render'

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

/// Image Information Cache

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
    const zIndex1 = mapWarpedMapSource.getZIndex(mapId1)
    const zIndex2 = mapWarpedMapSource.getZIndex(mapId2)

    if (zIndex1 !== undefined && zIndex2 !== undefined) {
      return zIndex1 - zIndex2
    }
  }

  return null
}

function mapWarpedMapLayerFirstTileAdded(event: Event) {
  if (event instanceof WarpedMapEvent) {
    const { mapId, tileUrl } = event.data

    const $mapsById = get(mapsById)
    const sourceMap = $mapsById.get(mapId)

    if (sourceMap && !sourceMap.renderOptions.removeBackground.color) {
      const cachedTile = mapWarpedMapLayer?.renderer.tileCache.getCachedTile(tileUrl)
      const imageBitmap = cachedTile?.imageBitmap

      if (imageBitmap) {
        console.log('Deze gebruiken:', imageBitmap, 'om uit te rekenen voor:', mapId)

        setRemoveBackgroundColor(mapId, '#fe3c21')
      } else {
        console.log('FOUT!')
      }

    }

    // console.log(sourceMap?.renderOptions)
    // console.log(mapId, 'tileAdded', 'kijken of dit is de eerste voor mapId')
    // console.log(imageBitmap,
    //   'als dat zo is dan kleur uitrekenen en ',
    //   setRemoveBackgroundColor
    // )


    // import {
    //   imageInfoCache,
    //   mapWarpedMapSource,
    //   addMap,
    //   removeMap
    // } from '$lib/shared/stores/openlayers.js'



//     import { fetchImageInfo } from '@allmaps/stdlib'
// import { Image } from '@allmaps/iiif-parser'

    // import { getBackgroundColor } from '$lib/shared/remove-background.js'
//

    // const imageUri = map.image.uri
    // const imageInfo = await fetchImageInfo(imageUri, {
    //   cache: imageInfoCache
    // })
    // const parsedImage = Image.parse(imageInfo)

    // // Process image once, also when the same image is used
    // // in multiple georeferenced maps
    // getBackgroundColor(map, parsedImage)
    //   .then((color) => setRemoveBackgroundColor(mapId, color))
    //   .catch((err) => {
    //     console.error(
    //       `Couldn't detect background color for map ${mapId}`,
    //       err
    //     )
    //   })
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

  // TODO: emit this event directly from WarpedMapLayer?
  mapWarpedMapLayer.renderer.tileCache.addEventListener(
    WarpedMapEventType.FIRSTTILEADDED,
    mapWarpedMapLayerFirstTileAdded
  )

  mapVectorLayer = new VectorLayer({
    source: mapVectorSource,
    style: invisiblePolygonStyle,
    renderOrder: mapVectorLayerOrderFunction as OrderFunction
  })

  mapOl = new Map({
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
  if (!mapWarpedMapSource.isVisible(mapId)) {
    mapWarpedMapSource.showMap(mapId)
    addMapToVectorSource(mapId)
  }
}

export function hideMap(mapId: string) {
  if (mapWarpedMapSource.isVisible(mapId)) {
    mapWarpedMapSource.hideMap(mapId)
    removeMapFromVectorSource(mapId)
  }
}

export async function addMap(viewerMap: ViewerMap) {
  await mapWarpedMapSource.addMap(viewerMap.map)
  addMapToVectorSource(viewerMap.mapId)
}

export async function removeMap(viewerMap: ViewerMap) {
  await mapWarpedMapSource.removeMap(viewerMap.map)
  removeMapFromVectorSource(viewerMap.mapId)
}

export function addMapToVectorSource(mapId: string) {
  const warpedMap = mapWarpedMapSource.getMap(mapId)
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
