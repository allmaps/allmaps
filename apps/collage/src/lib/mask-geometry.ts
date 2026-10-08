import { lonLatToWebMercator, webMercatorToLonLat } from '@allmaps/project'
import { placedMap, transformer } from './model.ts'
import type { CollageMap } from './model.ts'
import type { Point } from '@allmaps/types'

/** Hit-test the whole visible edge, keeping existing vertex handles first. */
export function maskEdgeAt(points: Point[], pointer: Point, tolerance = 12) {
  if (
    points.some(
      (p) => Math.hypot(p[0] - pointer[0], p[1] - pointer[1]) <= tolerance
    )
  )
    return
  let closest:
    | { index: number; position: Point; fraction: number; distance: number }
    | undefined
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length]
    const dx = b[0] - a[0],
      dy = b[1] - a[1]
    const fraction = Math.max(
      0,
      Math.min(
        1,
        ((pointer[0] - a[0]) * dx + (pointer[1] - a[1]) * dy) /
          (dx * dx + dy * dy)
      )
    )
    const position: Point = [a[0] + fraction * dx, a[1] + fraction * dy]
    const distance = Math.hypot(
      pointer[0] - position[0],
      pointer[1] - position[1]
    )
    if (distance <= tolerance && (!closest || distance < closest.distance))
      closest = { index, position, fraction, distance }
  })
  return closest
}

/** Stop at the image edge along the drag, including for newly inserted points. */
export function constrainToImage(
  from: Point,
  to: Point,
  width: number,
  height: number
): Point {
  const start: Point = [
    Math.max(0, Math.min(width, from[0])),
    Math.max(0, Math.min(height, from[1]))
  ]
  let fraction = 1
  for (const [axis, limit] of [width, height].entries()) {
    const delta = to[axis] - start[axis]
    if (to[axis] < 0) fraction = Math.min(fraction, -start[axis] / delta)
    else if (to[axis] > limit)
      fraction = Math.min(fraction, (limit - start[axis]) / delta)
  }
  return start.map((value, axis) =>
    Math.max(
      0,
      Math.min([width, height][axis], value + fraction * (to[axis] - value))
    )
  ) as Point
}

/** Match the placed raster, without changing the map's GCPs or orientation. */
export function maskCoordinates(item: CollageMap) {
  const transform = transformer(placedMap(item))
  const known = new Map<string, Point>()
  const toGeo = (point: Point): Point => {
    const geo = webMercatorToLonLat(transform.transformToProjectedGeo(point))
    // Untouched vertices must retain their exact resource coordinates.
    known.set(geo.join(','), [...point])
    return geo
  }
  const toResource = (geo: Point, seed?: Point): Point => {
    const exact = known.get(geo.join(','))
    if (exact) return [...exact]
    const target = lonLatToWebMercator(geo)
    let point: Point = seed ?? transform.transformToResource<Point>(target)
    // A fitted reverse TPS isn't the inverse of the forward warp. Refine it
    // against the rendered surface so dragging does not make vertices jump.
    for (let iteration = 0; iteration < 24; iteration++) {
      const here = transform.transformToProjectedGeo(point)
      const dx = target[0] - here[0]
      const dy = target[1] - here[1]
      const step = 0.01
      const x = transform.transformToProjectedGeo([point[0] + step, point[1]])
      const y = transform.transformToProjectedGeo([point[0], point[1] + step])
      const a = (x[0] - here[0]) / step
      const b = (y[0] - here[0]) / step
      const c = (x[1] - here[1]) / step
      const d = (y[1] - here[1]) / step
      const determinant = a * d - b * c
      if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-16)
        throw new Error('The map folds here. Try a point closer to the mask.')
      const delta: Point = [
        (d * dx - b * dy) / determinant,
        (a * dy - c * dx) / determinant
      ]
      point = [point[0] + delta[0], point[1] + delta[1]]
      if (Math.hypot(...delta) < 1e-6)
        return point.map((value) => Math.round(value * 1e6) / 1e6) as Point
    }
    throw new Error(
      'This point cannot be placed on the map. Try a closer point.'
    )
  }
  return { toGeo, toResource }
}
