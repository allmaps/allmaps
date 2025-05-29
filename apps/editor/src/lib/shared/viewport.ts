import { isGeojsonGeometry, computeBbox } from '@allmaps/stdlib'

import { LngLat } from 'maplibre-gl'

import type { Map as MapLibreMap } from 'maplibre-gl'

import type { Bbox } from '@allmaps/types'

import type { Viewport } from '$lib/types/shared.js'

import { MAPLIBRE_PADDING } from '$lib/shared/constants.js'

type Viewports = {
  state: Viewport
  navPlace: Viewport
  url: Viewport
  data: Viewport
}

export function getNavPlaceViewport(
  map: MapLibreMap,
  navPlace?: object
): Viewport | undefined {
  if (isGeojsonGeometry(navPlace)) {
    const bbox = computeBbox(navPlace)
    return getBboxViewport(map, bbox)
  }
}

export function getBboxViewport(
  map: MapLibreMap,
  bbox?: Bbox
): Viewport | undefined {
  if (bbox) {
    const camera = map.cameraForBounds(bbox, {
      padding: MAPLIBRE_PADDING
    })
    if (camera && camera.center && camera.zoom) {
      return {
        center: LngLat.convert(camera.center).toArray(),
        zoom: camera.zoom,
        bearing: 0
      }
    }
  }
}

function isViewport(viewport: Viewport | undefined): viewport is Viewport {
  return viewport !== undefined
}

export function sortGeoViewports(viewports: Partial<Viewports>): Viewport[] {
  // Return in this order:
  // 1. State
  // 2. Data (ie. mask/GCPs)
  // 3. navPlace
  // 4. Bbox URL parameter

  return [
    viewports.state,
    viewports.data,
    viewports.navPlace,
    viewports.url
  ].filter(isViewport)
}
