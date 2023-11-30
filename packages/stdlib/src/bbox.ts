import {
  isGeojsonGeometry,
  convertGeojsonGeometryToGeometry
} from './geojson.js'
import { isPoint, isPolygon, distance } from './geometry.js'

import type {
  Point,
  LineString,
  Polygon,
  Geometry,
  Line,
  Rectangle,
  Bbox,
  Size,
  GeojsonGeometry
} from '@allmaps/types'

// Compute

export function computeMinMax(values: number[]): [number, number] {
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
export function computeBbox(points: Geometry | GeojsonGeometry): Bbox {
  if (isPoint(points)) {
    points = [points]
  }
  if (isPolygon(points)) {
    points = points.flat()
  }
  if (isGeojsonGeometry(points)) {
    return computeBbox(convertGeojsonGeometryToGeometry(points))
  }

  const xs = []
  const ys = []

  for (const point of points as LineString) {
    xs.push(point[0])
    ys.push(point[1])
  }

  const [minX, maxX] = computeMinMax(xs)
  const [minY, maxY] = computeMinMax(ys)

  return [minX, minY, maxX, maxY]
}

export function combineBboxes(bbox0: Bbox, bbox1: Bbox): Bbox {
  return [
    Math.min(bbox0[0], bbox1[0]),
    Math.min(bbox0[1], bbox1[1]),
    Math.max(bbox0[2], bbox1[2]),
    Math.max(bbox0[3], bbox1[3])
  ]
}

//[xMin, yMin, xMax, yMax]
export function isOverlapping(bbox0: Bbox, bbox1: Bbox): boolean {
  const isOverlappingInX = bbox0[2] >= bbox1[0] && bbox1[2] >= bbox0[0]
  const isOverlappingInY = bbox0[3] >= bbox1[1] && bbox1[3] >= bbox0[1]

  return isOverlappingInX && isOverlappingInY
}

// Transform

export function bboxToRectangle(bbox: Bbox): Rectangle {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]]
  ]
}

export function bboxToPolygon(bbox: Bbox): Polygon {
  return [bboxToRectangle(bbox)]
}

export function bboxToLine(bbox: Bbox): Line {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]]
  ]
}

export function bboxToDiameter(bbox: Bbox): number {
  return distance(bboxToLine(bbox))
}

export function geometryToDiameter(
  geometry: Geometry | GeojsonGeometry
): number {
  return distance(bboxToLine(computeBbox(geometry)))
}

export function bboxToCenter(bbox: Bbox): Point {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

export function bboxToSize(bbox: Bbox): Size {
  return [bbox[2] - bbox[0], bbox[3] - bbox[1]]
}

// Scales

export function sizesToScale(size0: Size, size1: Size): number {
  const scaleX = size0[0] / size1[0]
  const scaleY = size0[1] / size1[1]
  return Math.min(scaleX, scaleY)
}

export function bboxesToScale(bbox0: Bbox, bbox1: Bbox): number {
  return sizesToScale(bboxToSize(bbox0), bboxToSize(bbox1))
}
