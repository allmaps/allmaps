import type { FilterSpecification } from 'maplibre-gl'

export type MaskBand = {
  id: string
  layerId: string
  sourceLayer: string
  minzoom: number
  maxzoom: number
  lineWidth: number
  lineOpacity: number
}

export const maskBands = [
  {
    id: 'global',
    layerId: 'masks-global',
    sourceLayer: 'masks_global',
    minzoom: 0,
    maxzoom: 6,
    lineWidth: 1.25,
    lineOpacity: 0.4
  },
  {
    id: 'continent',
    layerId: 'masks-continent',
    sourceLayer: 'masks_continent',
    minzoom: 2,
    maxzoom: 8,
    lineWidth: 1.5,
    lineOpacity: 0.5
  },
  {
    id: 'country',
    layerId: 'masks-country',
    sourceLayer: 'masks_country',
    minzoom: 4,
    maxzoom: 10,
    lineWidth: 1.75,
    lineOpacity: 0.6
  },
  {
    id: 'region',
    layerId: 'masks-region',
    sourceLayer: 'masks_region',
    minzoom: 6,
    maxzoom: 12,
    lineWidth: 2,
    lineOpacity: 0.7
  },
  {
    id: 'city',
    layerId: 'masks-city',
    sourceLayer: 'masks_city',
    minzoom: 8,
    maxzoom: 14,
    lineWidth: 2.5,
    lineOpacity: 0.8
  },
  {
    id: 'local',
    layerId: 'masks-local',
    sourceLayer: 'masks_local',
    minzoom: 10,
    maxzoom: 15,
    lineWidth: 3,
    lineOpacity: 0.9
  }
] as const satisfies readonly MaskBand[]

export const maskLayerIds = maskBands.map((maskBand) => maskBand.layerId)

export function getMaskFilter(maxArea: number): FilterSpecification {
  return [
    'all',
    ['>=', 'area', 0],
    ['<=', 'area', maxArea],
    ['!=', 'imageServiceDomain', 'iiif.nypl.org']
  ]
}
