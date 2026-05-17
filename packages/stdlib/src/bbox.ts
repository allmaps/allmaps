import monotoneChainConvexHull from 'monotone-chain-convex-hull'

import { isGeojsonGeometry, geojsonGeometryToPoints } from './geojson.js'
import {
  distance,
  isGeometry,
  geometryToPoints,
  rotatePoints,
  rotatePoint,
  midPoint
} from './geometry.js'

import type {
  Point,
  Polygon,
  Geometry,
  Line,
  Rectangle,
  Bbox,
  Size,
  Fit,
  GeojsonGeometry,
  Ring
} from '@allmaps/types'

export const MIN_POINT_LNG_LAT_PROJECTION = [-180, -90] as Point
export const MAX_POINT_LNG_LAT_PROJECTION = [180, 90] as Point
export const MIN_POINT_WEBMERCATOR_PROJECTION = [
  -20037508.34, -20048966.1
] as Point
export const MAX_POINT_WEBMERCATOR_PROJECTION = [
  20037508.34, 20048966.1
] as Point

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

export function clipValue(value: number, min: number, max: number): number {
  return Math.max(Math.min(value, max), min)
}

export function clipPoint(point: Point, min: Point, max: Point): Point {
  return [
    clipValue(point[0], min[0], max[0]),
    clipValue(point[1], min[1], max[1])
  ]
}

export function clipPointLngLatProjection(point: Point): Point {
  return clipPoint(
    point,
    MIN_POINT_LNG_LAT_PROJECTION,
    MAX_POINT_LNG_LAT_PROJECTION
  )
}

export function clipPointWebMercatorProjection(point: Point): Point {
  return clipPoint(
    point,
    MIN_POINT_WEBMERCATOR_PROJECTION,
    MAX_POINT_WEBMERCATOR_PROJECTION
  )
}

// Note: bbox order is minX, minY, maxX, maxY
export function computeBbox(geometry: Geometry | GeojsonGeometry): Bbox {
  let points: Point[]
  if (isGeometry(geometry)) {
    points = geometryToPoints(geometry)
  } else if (isGeojsonGeometry(geometry)) {
    points = geojsonGeometryToPoints(geometry)
  } else {
    throw new Error(`Unsupported Geometry`)
  }

  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])

  const [minX, maxX] = computeMinMax(xs)
  const [minY, maxY] = computeMinMax(ys)

  return [minX, minY, maxX, maxY]
}

// Takes angle in radians
export function computeRotatedBboxProperties(
  geometry: Geometry | GeojsonGeometry,
  angle: number
): {
  center: Point
  size: Size
  bbox: Bbox
  rectangle: Rectangle
  rotatedRectangle: Rectangle
} {
  let points: Point[]
  if (isGeometry(geometry)) {
    points = geometryToPoints(geometry)
  } else if (isGeojsonGeometry(geometry)) {
    points = geojsonGeometryToPoints(geometry)
  } else {
    throw new Error(`Unsupported Geometry`)
  }

  // Note: approach similar to Viewport.fromSizeAndProjectedGeoPolygon()

  // Initially pivot around midpoint
  const pivot: Point = midPoint(...points)

  // Rotate points around the pivot and compute bbox and it's center
  const rotatedPoints = rotatePoints(points, angle, pivot)
  const rotatedPointsBbox = computeBbox(rotatedPoints)
  const rotatedPointsBboxCenter = bboxToCenter(rotatedPointsBbox)
  const size = bboxToSize(rotatedPointsBbox)

  // Rotate center back around pivot and construct final 'bbox'
  // (but actually rectangle, since bbox must be horizontal)
  // around center, using same width and height as rotated bbox
  const center = rotatePoint(rotatedPointsBboxCenter, -angle, pivot)
  const bbox = sizeToBbox(size, center)
  const rectangle = bboxToRectangle(bbox) as Rectangle
  const rotatedRectangle = rotatePoints(rectangle, -angle, center) as Rectangle

  return { center, size, bbox, rectangle, rotatedRectangle }
}

export function combineBboxes(...bboxes: Bbox[]): Bbox | undefined {
  if (bboxes.length === 0) {
    return undefined
  }

  return [
    Math.min(...bboxes.map((bbox) => bbox[0])),
    Math.min(...bboxes.map((bbox) => bbox[1])),
    Math.max(...bboxes.map((bbox) => bbox[2])),
    Math.max(...bboxes.map((bbox) => bbox[3]))
  ]
}

export function doBboxesIntersect(bbox0: Bbox, bbox1: Bbox): boolean {
  const isOverlappingInX = bbox0[2] >= bbox1[0] && bbox1[2] >= bbox0[0]
  const isOverlappingInY = bbox0[3] >= bbox1[1] && bbox1[3] >= bbox0[1]

  return isOverlappingInX && isOverlappingInY
}

export function intersectBboxes(bbox0: Bbox, bbox1: Bbox): Bbox | undefined {
  const minX = Math.max(bbox0[0], bbox1[0])
  const maxX = Math.min(bbox0[2], bbox1[2])
  const minY = Math.max(bbox0[1], bbox1[1])
  const maxY = Math.min(bbox0[3], bbox1[3])

  if (minX < maxX && minY < maxY) {
    return [minX, minY, maxX, maxY]
  } else {
    return undefined
  }
}

export function pointInBbox(point: Point, bbox: Bbox): boolean {
  return doBboxesIntersect([point[0], point[1], point[0], point[1]], bbox)
}

export function bufferBbox(bbox: Bbox, dist0: number, dist1?: number): Bbox {
  if (dist1 === undefined) {
    dist1 = dist0
  }
  return [bbox[0] - dist0, bbox[1] - dist1, bbox[2] + dist0, bbox[3] + dist1]
}

// Ratio 2 adds half the current width (or height) both left and right of the current (width or height)
// so the total width (or height) goes * 2 and the total surface goes * 4
export function bufferBboxByRatio(bbox: Bbox, ratio?: number): Bbox {
  if (!ratio || ratio === 1) {
    return bbox
  }
  const size = bboxToSize(bbox)
  return bufferBbox(
    bbox,
    ...(size.map((widthOrHeigth) => (widthOrHeigth * (ratio - 1)) / 2) as [
      number,
      number
    ])
  )
}

// Transform

// Returns a rectangle with four points, starting from lower left and going anti-clockwise.
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
  return distance(...bboxToLine(bbox))
}

export function geometryToDiameter(
  geometry: Geometry | GeojsonGeometry
): number {
  return distance(...bboxToLine(computeBbox(geometry)))
}

export function bboxToCenter(bbox: Bbox): Point {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

export function bboxToSize(bbox: Bbox): Size {
  return [bbox[2] - bbox[0], bbox[3] - bbox[1]]
}

export function bboxToResolution(bbox: Bbox): number {
  return sizeToResolution(bboxToSize(bbox))
}

// Approximate results for quadrilaterals, exact for rectangles (e.g. coming from bboxes).
// A more precise result would require a minimal-covering-rectangle algorithm
// Or computing and comparing rectangle surfaces
export function rectangleToSize(rectangle: Rectangle): Size {
  return [
    0.5 *
      (distance(rectangle[0], rectangle[1]) +
        distance(rectangle[2], rectangle[3])),
    0.5 *
      (distance(rectangle[1], rectangle[2]) +
        distance(rectangle[3], rectangle[0]))
  ]
}

// Convex hull

export function convexHull(points: Point[]): Ring | undefined {
  if (points.length === 0) {
    return undefined
  }

  return monotoneChainConvexHull(points)
}

// Sizes and Scales

/**
 * Compute a scale from two sizes
 *
 * For unspecified 'fit', the scale is computed based on the surface area derived from the sizes.
 *
 * For specified 'fit':
 *
 * Example for square rectangles bbox0 '*' and bbox1 '.':
 *
 * 'contain' where '*' contains '.'
 * (in the first size0 is relatively wider)
 *
 *                ****
 *                *  *
 *   **....**     ....
 *   * .  . *     .  .
 *   **....**     ....
 *                *  *
 *                ****
 *
 *
 * 'cover' where '*' is covered by '.'
 * (in the first size0 is relatively wider)
 *
 *                ....
 *                .  .
 *   ..****..     ****
 *   . *  * .     *  *
 *   ..****..     ****
 *                .  .
 *                ....
 *
 * 'equal' where '*' is of equal area as '.'
 * (in the first size0 is relatively wider)
 *
 *     ****       ....
 *    .*..*.     *.**.*
 *    .*  *.     *.  .*
 *    .*..*.     *.**.*
 *     ****       ....
 *
 * @export
 * @param size0 - first size
 * @param size1 - second size
 * @param fit - fit
 */
export function sizesToScale(size0: Size, size1: Size, fit?: Fit): number {
  if (fit === 'contain') {
    return size0[0] / size0[1] >= size1[0] / size1[1] // size0 is relatively wider
      ? size0[0] / size1[0]
      : size0[1] / size1[1]
  } else if (fit === 'cover') {
    return size0[0] / size0[1] >= size1[0] / size1[1] // size0 is relatively wider
      ? size0[1] / size1[1]
      : size0[0] / size1[0]
  } else if (!fit || fit == 'equal') {
    return Math.sqrt((size0[0] * size0[1]) / (size1[0] * size1[1]))
  } else {
    throw new Error('Unknown fit')
  }
}

export function scaleBbox(bbox: Bbox, scale: number): Bbox {
  const center = bboxToCenter(bbox)
  let size = bboxToSize(bbox)
  size = scaleSize(size, scale)
  return sizeToBbox(size, center)
}

export function scaleSize(size: Size, scale: number): Size {
  return [size[0] * scale, size[1] * scale]
}

export function sizeToResolution(size: Size): number {
  return size[0] * size[1]
}

export function sizeToCenter(size: Size): Point {
  return [size[0] / 2, size[1] / 2]
}

export function sizeToBbox(size: Size, center?: Point): Bbox {
  // Note: passing no center not the same as passing center [0, 0]
  if (center) {
    return [
      center[0] - size[0] / 2,
      center[1] - size[1] / 2,
      center[0] + size[0] / 2,
      center[1] + size[1] / 2
    ]
  } else {
    return [0, 0, ...size]
  }
}

export function sizeToRectangle(size: Size, center?: Point): Rectangle {
  return bboxToRectangle(sizeToBbox(size, center))
}

export function bboxesToScale(bbox0: Bbox, bbox1: Bbox, fit?: Fit): number {
  return sizesToScale(bboxToSize(bbox0), bboxToSize(bbox1), fit)
}

export function rectanglesToScale(
  rectangle0: Rectangle,
  rectangle1: Rectangle,
  fit?: Fit
): number {
  return sizesToScale(
    rectangleToSize(rectangle0),
    rectangleToSize(rectangle1),
    fit
  )
}
