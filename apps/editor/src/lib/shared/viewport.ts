import { isGeojsonGeometry, computeBbox } from '@allmaps/stdlib'

import type { Bbox } from '@allmaps/types'

import type { Viewport } from '$lib/types/shared.js'

type Viewports = {
  state: Viewport
  navPlace: Viewport
  url: Viewport
  data: Viewport
}

export function getNavPlaceViewport(navPlace?: object): Viewport | undefined {
  if (isGeojsonGeometry(navPlace)) {
    const bbox = computeBbox(navPlace)
    return getBboxViewport(bbox)
  }
}

export function getBboxViewport(bbox?: Bbox): Viewport | undefined {
  if (bbox) {
    return { bounds: bbox }
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
