import { basemapStyle } from '@allmaps/basemap'

import { LngLat } from 'maplibre-gl'

import type { Map as MapLibreMap } from 'maplibre-gl'

import type { Bbox } from '@allmaps/types'

import type { Viewport } from '$lib/types/shared.js'

import { MAPLIBRE_PADDING } from '$lib/shared/constants.js'

import type {
  StyleSpecification,
  SourceSpecification,
  LayerSpecification
} from 'maplibre-gl'

import type {
  BasemapPresetItem,
  BasemapRasterPresetItem
} from '$lib/types/shared.js'

export function getCenterZoomFromBbox(
  map: MapLibreMap,
  bbox: Bbox
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

export function getStyle(basemap: BasemapPresetItem) {
  if (basemap.type === 'raster') {
    return getXyzLayerStyle(basemap)
  } else if (basemap.value === 'protomaps') {
    return getProtomapsStyle()
  } else {
    throw new Error(`Unknown basemap type: ${basemap.type}`)
  }
}

export function getProtomapsStyle(): StyleSpecification {
  // @ts-expect-error incorrect MapLibre types
  return basemapStyle('en')
}

export function getXyzLayerStyle(
  basemap: BasemapRasterPresetItem
): StyleSpecification {
  return {
    version: 8 as const,
    glyphs: 'https://fonts.allmaps.org/maplibre/{fontstack}/{range}.pbf',
    sources: {
      xyz: {
        type: 'raster' as const,
        tiles: [basemap.url],
        tileSize: 256,
        attribution: basemap.attribution || ''
      }
    },
    layers: [
      {
        id: 'xyz',
        type: 'raster' as const,
        source: 'xyz',
        paint: {
          'raster-opacity': 1
        }
      }
    ]
  }
}

function isTerraDrawId(id: unknown) {
  return typeof id === 'string' && id.startsWith('td-')
}

export function isTerraDrawSource(source: SourceSpecification) {
  return 'id' in source && isTerraDrawId(source.id)
}

export function isTerraDrawLayer(layer: LayerSpecification) {
  return 'id' in layer && isTerraDrawId(layer.id)
}
