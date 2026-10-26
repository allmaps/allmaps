import { isGeojsonGeometry, computeBbox, combineBboxes } from '@allmaps/stdlib'

import type { Bbox } from '@allmaps/types'

import type { Viewport } from '$lib/types/shared.js'

type Viewports = {
  state: Viewport
  navPlace: Viewport
  url: Viewport
  data: Viewport
}

function normalizeCoordinates(coordinates: unknown): unknown {
  if (Array.isArray(coordinates)) {
    return coordinates.map(normalizeCoordinates)
  }
  const coordinate =
    typeof coordinates === 'string' && coordinates.trim() !== ''
      ? Number(coordinates)
      : coordinates
  return typeof coordinate === 'number' && Number.isFinite(coordinate)
    ? coordinate
    : undefined
}

function getNavPlaceBbox(geometry: unknown): Bbox | undefined {
  if (!isGeojsonGeometry(geometry)) return

  // Some IIIF providers serialize navPlace coordinates as numeric strings.
  const normalizedGeometry = {
    ...geometry,
    coordinates: normalizeCoordinates(geometry.coordinates)
  }
  if (!isGeojsonGeometry(normalizedGeometry)) return

  try {
    const bbox = computeBbox(normalizedGeometry)
    return bbox.every(Number.isFinite) ? bbox : undefined
  } catch {
    // Optional location metadata must not prevent opening an image.
    return undefined
  }
}

export function getNavPlaceViewport(navPlace?: object): Viewport | undefined {
  if (
    navPlace &&
    'type' in navPlace &&
    navPlace.type === 'FeatureCollection' &&
    'features' in navPlace &&
    Array.isArray(navPlace.features)
  ) {
    const bboxes = navPlace.features.flatMap((feature: unknown) => {
      if (
        typeof feature === 'object' &&
        feature !== null &&
        'geometry' in feature
      ) {
        const bbox = getNavPlaceBbox(feature.geometry)
        return bbox ? [bbox] : []
      }

      return []
    })
    const bbox = combineBboxes(...bboxes)
    return getBboxViewport(bbox)
  }

  return getBboxViewport(getNavPlaceBbox(navPlace))
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
