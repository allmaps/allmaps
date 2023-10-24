import {
  isGeojsonLineString,
  isGeojsonPolygon,
  convertGeojsonLineStringToLineString,
  convertGeojsonPolygonToPolygon
} from './geojson.js'
import { isPolygon } from './geometry.js'

import type {
  Polygon,
  LineString,
  Bbox,
  Extent,
  GeojsonLineString,
  GeojsonPolygon
} from '@allmaps/types'

export function computeExtent(values: number[]): Extent {
  let min: number = Number.POSITIVE_INFINITY
  let max: number = Number.NEGATIVE_INFINITY

  for (const value of values) {
    if (min === undefined) {
      if (value >= value) min = max = value
    } else {
      if (min > value) min = value
      if (max < value) max = value
    }
  }

  return [min, max]
}

// Note: bbox order is minX, minY, maxX, maxY
export function computeBbox(points: LineString): Bbox
export function computeBbox(points: Polygon): Bbox
export function computeBbox(points: GeojsonLineString): Bbox
export function computeBbox(points: GeojsonPolygon): Bbox
export function computeBbox(
  points: LineString | Polygon | GeojsonLineString | GeojsonPolygon
): Bbox {
  if (isPolygon(points)) {
    points = points.flat()
  }
  if (isGeojsonLineString(points)) {
    points = convertGeojsonLineStringToLineString(points)
  }
  if (isGeojsonPolygon(points)) {
    points = convertGeojsonPolygonToPolygon(points).flat()
  }

  const xs = []
  const ys = []

  for (const point of points as LineString) {
    xs.push(point[0])
    ys.push(point[1])
  }

  const [minX, maxX] = computeExtent(xs)
  const [minY, maxY] = computeExtent(ys)

  return [minX, minY, maxX, maxY]
}

export function combineBboxes(bbox1: Bbox, bbox2: Bbox): Bbox {
  return [
    Math.min(bbox1[0], bbox2[0]),
    Math.min(bbox1[1], bbox2[1]),
    Math.max(bbox1[2], bbox2[2]),
    Math.max(bbox1[3], bbox2[3])
  ]
}

export function bboxToPolygon(bbox: Bbox): Polygon {
  return [
    [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[1]],
      [bbox[2], bbox[3]],
      [bbox[0], bbox[3]]
    ]
  ]
}
