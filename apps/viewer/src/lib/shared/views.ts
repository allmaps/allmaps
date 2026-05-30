import { webMercatorProjection } from '@allmaps/project'

import type { Map as MapLibreMap, LngLatBoundsLike } from 'maplibre-gl'

import type { WarpedMapLayer } from '@allmaps/maplibre'

export function setView(
  view: 'map' | 'image',
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  selectedMapIdForImageView: string,
  duration: number,
  padding: number,
  previousMapBounds?: LngLatBoundsLike
) {
  if (view === 'map') {
    setMapView(
      map,
      warpedMapLayer,
      selectedMapIdForImageView,
      duration,
      padding,
      previousMapBounds
    )
  } else if (view === 'image') {
    setImageView(
      map,
      warpedMapLayer,
      selectedMapIdForImageView,
      duration,
      padding
    )
  }
}

function setMapView(
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  selectedMapIdForImageView: string,
  duration: number,
  padding: number,
  previousMapBounds?: LngLatBoundsLike
) {
  // map.setMaxBounds()
  showBasemap(map, warpedMapLayer)

  warpedMapLayer.setMapsOptions((mapId) =>
    mapId === selectedMapIdForImageView
      ? {
          applyMask: true,
          renderMask: true,
          transformationType: undefined,
          internalProjection: undefined,
          renderAppliedMask: true
        }
      : {
          renderMask: false,
          visible: true,
          transformationType: undefined,
          internalProjection: undefined,
          renderAppliedMask: false
        }
  )

  if (previousMapBounds) {
    map.fitBounds(previousMapBounds, {
      padding,
      duration,
      bearing: 0
    })
  } else if (selectedMapIdForImageView) {
    const selectedWarpedMap = warpedMapLayer.getWarpedMap(
      selectedMapIdForImageView
    )
    if (selectedWarpedMap) {
      map.fitBounds(selectedWarpedMap.geoMaskBbox, {
        padding,
        duration,
        bearing: 0
      })
    }
  }
}

function setImageView(
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  selectedMapIdForImageView: string,
  duration: number,
  padding: number
) {
  const selectedWarpedMap = warpedMapLayer.getWarpedMap(
    selectedMapIdForImageView
  )

  if (selectedWarpedMap) {
    hideBasemap(map, warpedMapLayer, duration)

    warpedMapLayer.setMapsOptions((mapId) =>
      mapId === selectedMapIdForImageView
        ? {
            applyMask: false,
            renderAppliedMask: false,
            renderMask: true,
            transformationType: 'helmert',
            internalProjection: webMercatorProjection
          }
        : {
            visible: false,
            transformationType: 'helmert',
            internalProjection: webMercatorProjection
          }
    )

    // previousMapBounds = map.getBounds()

    const { center, zoom, bearing } = warpedMapLayer.getMapsCenterZoomBearing(
      [selectedMapIdForImageView],
      { padding }
    )

    map.easeTo({
      center,
      zoom,
      bearing,
      duration
    })

    // map.once('idle', () => {
    // map.setMaxBounds(map.getBounds())
    // map.setMaxBounds(bufferBboxByRatio(selectedWarpedMap.geoFullMaskBbox, 3))
    // })
  }
}

async function showBasemap(map: MapLibreMap, warpedMapLayer: WarpedMapLayer) {
  for (const layer of map.getLayersOrder()) {
    if (layer !== warpedMapLayer?.id) {
      map.setLayoutProperty(layer, 'visibility', 'visible')
    }
  }

  // await tick()
  map.setPaintProperty('white-background', 'background-opacity', 0)
}

function hideBasemap(
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  duration: number
) {
  map.setPaintProperty('white-background', 'background-opacity', 1)

  setTimeout(() => {
    for (const layer of map.getLayersOrder()) {
      if (layer !== warpedMapLayer.id) {
        map.setLayoutProperty(layer, 'visibility', 'none')
      }
    }
  }, duration)
}

export function selectMap(
  view: 'map' | 'image',
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  duration: number,
  padding: number,
  mapId?: string,
  previousMapId?: string,
  flyTo = false
) {
  if (view === 'map') {
    selectMapInMapView(
      map,
      warpedMapLayer,
      duration,
      padding,
      mapId,
      previousMapId,
      flyTo
    )
  } else if (view === 'image') {
    selectMapInImageView(
      map,
      warpedMapLayer,
      duration,
      padding,
      mapId,
      previousMapId
    )
  }
}

function selectMapInMapView(
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  duration: number,
  padding: number,
  selectedMapId?: string,
  previousSelectedMapId?: string,
  flyTo?: boolean
) {
  if (selectedMapId || previousSelectedMapId) {
    warpedMapLayer.setMapsOptions((mapId) => {
      if (mapId === selectedMapId) {
        return { renderMask: true, renderAppliedMask: false }
      } else if (mapId === previousSelectedMapId) {
        return { renderMask: false, renderAppliedMask: false }
      }
    })
  }

  if (selectedMapId && flyTo) {
    const warpedMap = warpedMapLayer.getWarpedMap(selectedMapId)

    if (warpedMap) {
      map.fitBounds(warpedMap.geoMaskBbox, {
        padding,
        duration
      })
    }
  }
}

function selectMapInImageView(
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  duration: number,
  padding: number,
  selectedMapId?: string,
  previousSelectedMapId?: string
) {
  // map.setMaxBounds()

  if (selectedMapId) {
    warpedMapLayer.setMapsOptions(
      (mapId) => {
        if (mapId === selectedMapId) {
          return {
            visible: true,
            applyMask: false,
            renderAppliedMask: false,
            renderMask: true,
            transformationType: 'helmert'
          }
        } else if (mapId === previousSelectedMapId) {
          return {
            visible: false,
            applyMask: true,
            renderAppliedMask: false,
            renderMask: false,
            transformationType: undefined
          }
        }
      },
      { animate: false }
    )

    const { center, zoom, bearing } = warpedMapLayer.getMapsCenterZoomBearing(
      [selectedMapId],
      { padding }
    )

    map.jumpTo({
      center,
      zoom,
      bearing
    })

    // map.setMaxBounds(map.getBounds())
  }
}
