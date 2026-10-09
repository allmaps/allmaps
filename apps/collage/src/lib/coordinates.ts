import { lonLatToWebMercator, webMercatorToLonLat } from '@allmaps/project'
import type { Point } from '@allmaps/types'

// Drawing units are independent of ground meters. A common scale gives the
// canvas room for world atlases without changing layout, relative sizes or export.
export const CANVAS_SCALE = 1 / 8
export const CANVAS_ZOOM_OFFSET = 3

// Keep exported latitude away from the poles, where Mercator loses precision.
// This also keeps drawing coordinates inside MapLibre's camera extent.
export const MAX_COLLAGE_COORDINATE = 100_000_000

export function toCanvasGeo(point: Point): Point {
  return webMercatorToLonLat([point[0] * CANVAS_SCALE, point[1] * CANVAS_SCALE])
}

export function fromCanvasGeo(geo: Point): Point {
  const point = lonLatToWebMercator(geo)
  return [point[0] / CANVAS_SCALE, point[1] / CANVAS_SCALE]
}
