import type { BBox, SVGPolygon, Extent } from './types.js'

// TODO: move to @allmaps/stdlib

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

export function computeBBox(points: SVGPolygon): BBox {
  const xs = []
  const ys = []

  for (let point of points) {
    xs.push(point[0])
    ys.push(point[1])
  }

  const [minX, maxX] = computeExtent(xs)
  const [minY, maxY] = computeExtent(ys)

  return [minX, minY, maxX, maxY]
}

export function combineBBoxes(bbox1: BBox, bbox2: BBox): BBox {
  return [
    Math.min(bbox1[0], bbox2[0]),
    Math.min(bbox1[1], bbox2[1]),
    Math.max(bbox1[2], bbox2[2]),
    Math.max(bbox1[3], bbox2[3])
  ]
}

export function bboxToSvgPolygon(bbox: BBox): SVGPolygon {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]]
  ]
}
