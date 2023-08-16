import { Stroke, Fill, Style } from 'ol/style.js'
import type Feature from 'ol/Feature.js'

import type { SVGPolygon } from '@allmaps/render'

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

export function maskToPolygon(pixelMask: SVGPolygon) {
  return [
    [
      ...pixelMask.map((coordinate) => [coordinate[0], -coordinate[1]]),
      [pixelMask[0][0], -pixelMask[0][1]]
    ]
  ]
}

export function idsFromFeatures(features: Feature[]) {
  return features.map((feature) => String(feature.getId()))
}
