import { webMercatorProjection } from '@allmaps/project'

import type { Map as MapLibreMap, LngLatBoundsLike } from 'maplibre-gl'

import type { WarpedMapLayer } from '@allmaps/maplibre'

type SetViewResult = {
  naturalBearing?: number
}

export function setView(
  view: 'map' | 'image',
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  selectedMapIdForView: string | undefined,
  duration: number,
  padding: number,
  previousMapBounds?: LngLatBoundsLike,
  preserveCameraIfZoomedIn = false,
  previousView?: 'map' | 'image',
  previousImageViewBearing?: number
): SetViewResult {
  if (view === 'map') {
    return setMapView(
      map,
      warpedMapLayer,
      selectedMapIdForView,
      duration,
      padding,
      previousMapBounds,
      preserveCameraIfZoomedIn,
      previousView,
      previousImageViewBearing
    )
  } else if (view === 'image') {
    if (!selectedMapIdForView) {
      return {}
    }

    return setImageView(
      map,
      warpedMapLayer,
      selectedMapIdForView,
      duration,
      padding,
      preserveCameraIfZoomedIn,
      previousView
    )
  }

  return {}
}

function getBearingWithPreservedDifference(
  currentBearing: number,
  sourceBearing: number,
  destinationBearing: number
) {
  return destinationBearing + currentBearing - sourceBearing
}

function preserveCamera(map: MapLibreMap, duration: number, bearing: number) {
  map.easeTo({
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing,
    duration
  })
}

function setMapView(
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  selectedMapIdForImageView: string | undefined,
  duration: number,
  padding: number,
  previousMapBounds?: LngLatBoundsLike,
  preserveCameraIfZoomedIn = false,
  previousView?: 'map' | 'image',
  previousImageViewBearing?: number
): SetViewResult {
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
          applyMask: true,
          renderMask: false,
          visible: true,
          transformationType: undefined,
          internalProjection: undefined,
          renderAppliedMask: false
        }
  )

  let mapBounds = previousMapBounds

  if (!mapBounds && selectedMapIdForImageView) {
    const selectedWarpedMap = warpedMapLayer.getWarpedMap(
      selectedMapIdForImageView
    )
    mapBounds = selectedWarpedMap?.geoMaskBbox
  }

  mapBounds = mapBounds ?? warpedMapLayer.getBounds()

  if (!mapBounds) {
    return {}
  }

  const camera = map.cameraForBounds(mapBounds, {
    padding,
    bearing: 0
  })

  if (
    preserveCameraIfZoomedIn &&
    camera?.zoom !== undefined &&
    map.getZoom() > camera.zoom
  ) {
    preserveCamera(
      map,
      duration,
      getMapViewBearingWithPreservedDifference(
        map,
        previousView,
        previousImageViewBearing
      )
    )
    return {}
  }

  map.fitBounds(mapBounds, {
    padding,
    duration,
    bearing: 0
  })

  return {}
}

function setImageView(
  map: MapLibreMap,
  warpedMapLayer: WarpedMapLayer,
  selectedMapIdForImageView: string,
  duration: number,
  padding: number,
  preserveCameraIfZoomedIn = false,
  previousView?: 'map' | 'image'
): SetViewResult {
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

    if (
      preserveCameraIfZoomedIn &&
      zoom !== undefined &&
      map.getZoom() > zoom
    ) {
      preserveCamera(
        map,
        duration,
        getImageViewBearingWithPreservedDifference(
          map,
          bearing ?? 0,
          previousView
        )
      )
      return { naturalBearing: bearing }
    }

    map.easeTo({
      center,
      zoom,
      bearing,
      duration
    })

    return { naturalBearing: bearing }

    // map.once('idle', () => {
    // map.setMaxBounds(map.getBounds())
    // map.setMaxBounds(bufferBboxByRatio(selectedWarpedMap.geoFullMaskBbox, 3))
    // })
  }

  return {}
}

function getMapViewBearingWithPreservedDifference(
  map: MapLibreMap,
  previousView: 'map' | 'image' | undefined,
  previousImageViewBearing: number | undefined
) {
  const destinationBearing = 0

  if (previousView !== 'image' || previousImageViewBearing === undefined) {
    return map.getBearing()
  }

  return getBearingWithPreservedDifference(
    map.getBearing(),
    previousImageViewBearing,
    destinationBearing
  )
}

function getImageViewBearingWithPreservedDifference(
  map: MapLibreMap,
  destinationBearing: number,
  previousView: 'map' | 'image' | undefined
) {
  if (previousView !== 'map') {
    return map.getBearing()
  }

  return getBearingWithPreservedDifference(
    map.getBearing(),
    0,
    destinationBearing
  )
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
