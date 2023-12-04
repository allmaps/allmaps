import { Stroke, Fill, Style } from 'ol/style.js'
import type Feature from 'ol/Feature.js'

import type { Ring } from '@allmaps/types'

export function invisiblePolygonStyle() {
  return new Style({
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.0)'
    })
  })
}

export function outlinePolygonStyle() {
  return new Style({
    stroke: new Stroke({
      color: '#FF56BA',
      width: 1
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.0)'
    })
  })
}

export function selectedPolygonStyle() {
  return new Style({
    stroke: new Stroke({
      color: '#FF56BA',
      width: 3
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.0)'
    })
  })
}

export function maskToPolygon(resourceMask: Ring) {
  return [
    [
      ...resourceMask.map((coordinate) => [coordinate[0], -coordinate[1]]),
      [resourceMask[0][0], -resourceMask[0][1]]
    ]
  ]
}

export function idsFromFeatures(features: Feature[]) {
  return features.map((feature) => String(feature.getId()))
}
