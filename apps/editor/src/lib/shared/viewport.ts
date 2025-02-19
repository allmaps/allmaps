import { fromLonLat } from 'ol/proj'
import { getCenter } from 'ol/extent'

import { isGeojsonGeometry, computeBbox } from '@allmaps/stdlib'

import type View from 'ol/View'
import type { Extent } from 'ol/extent'

import type { Viewport } from '$lib/types/shared.js'

type Viewports = {
  state: Viewport
  navPlace: Viewport
  url: Viewport
  data: Viewport
}

export function getExtentViewport(
  view: View,
  extent: Extent
): Viewport | undefined {
  const resolution = view.getResolutionForExtent(extent)
  const zoom = view.getZoomForResolution(resolution)
  const center = getCenter(extent)

  if (zoom) {
    return {
      center,
      zoom,
      rotation: 0
    }
  }
}

export function getNavPlaceViewport(
  view: View,
  navPlace?: object
): Viewport | undefined {
  if (isGeojsonGeometry(navPlace)) {
    const bbox = computeBbox(navPlace)
    return getBboxViewport(view, bbox)
  }
}

export function getBboxViewport(
  view: View,
  bbox?: number[]
): Viewport | undefined {
  if (bbox) {
    const extent = [
      ...fromLonLat([bbox[0], bbox[1]]),
      ...fromLonLat([bbox[2], bbox[3]])
    ]

    return getExtentViewport(view, extent)
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
