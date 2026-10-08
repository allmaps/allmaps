import type { Point } from '@allmaps/types'

export type Bounds = [number, number, number, number]

export function bounds(points: Point[]): Bounds {
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

// Clip against all four edges, including when the polygon covers the viewport
// but none of its vertices are on screen (Sutherland–Hodgman).
export function clipPolygon(polygon: Point[], rect: Bounds): Point[] {
  let result = polygon
  for (const [axis, edge, sign] of [
    [0, rect[0], 1],
    [0, rect[2], -1],
    [1, rect[1], 1],
    [1, rect[3], -1]
  ]) {
    const input = result
    result = []
    for (let i = 0; i < input.length; i++) {
      const a = input[(i + input.length - 1) % input.length]
      const b = input[i]
      const aInside = (a[axis] - edge) * sign >= 0
      const bInside = (b[axis] - edge) * sign >= 0
      if (aInside !== bInside) {
        const t = (edge - a[axis]) / (b[axis] - a[axis])
        result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
      }
      if (bInside) result.push(b)
    }
  }
  return result
}

export function visibleCenter(
  polygons: Point[][],
  viewport: Bounds
): Point | undefined {
  const visible = polygons.flatMap((polygon) => clipPolygon(polygon, viewport))
  if (!visible.length) return
  const [left, top, right, bottom] = bounds(visible)
  return [(left + right) / 2, (top + bottom) / 2]
}

/** Largest-first spiral packing, inspired by Maps Exposé:
 * https://observablehq.com/d/c3bb51b7e4a6e502
 * Search padded boxes along an aspect-adjusted Archimedean spiral. Sorting is
 * only for placement: the result retains input order, dimensions and angles.
 */
export function packBoxes(sizes: Point[], aspect = 1): Point[] {
  if (!sizes.length) return []
  const averageSide = Math.sqrt(
    sizes.reduce((sum, [w, h]) => sum + w * h, 0) / sizes.length
  )
  const padding = Math.max(averageSide / 10, 0.01)
  const growth = Math.max(averageSide, 0.1) / (4 * Math.PI)
  const ratio = Math.max(0.5, Math.min(2, aspect))
  const placed: Bounds[] = []
  const positions: Point[] = new Array(sizes.length)
  const order = sizes
    .map((size, index) => ({ size, index }))
    .sort((a, b) => b.size[0] * b.size[1] - a.size[0] * a.size[1])
  for (const {
    size: [width, height],
    index
  } of order) {
    const halfWidth = width / 2 + padding
    const halfHeight = height / 2 + padding
    let point: Point = [0, 0]
    let box: Bounds = [-halfWidth, -halfHeight, halfWidth, halfHeight]
    let step = 0
    while (
      placed.some(
        (other) =>
          box[0] < other[2] &&
          box[2] > other[0] &&
          box[1] < other[3] &&
          box[3] > other[1]
      )
    ) {
      const angle = (++step * Math.PI) / 50
      point = [
        growth * angle * Math.cos(angle),
        (growth * angle * Math.sin(angle)) / ratio
      ]
      // Bound work for exceptionally thin or disparate maps. Placing beside
      // the current extent is guaranteed to be clear and preserves scale.
      if (step > 20000)
        point = [Math.max(...placed.map((p) => p[2])) + halfWidth, 0]
      box = [
        point[0] - halfWidth,
        point[1] - halfHeight,
        point[0] + halfWidth,
        point[1] + halfHeight
      ]
    }
    placed.push(box)
    positions[index] = point
  }
  const extent = bounds(
    positions.flatMap((p, i): Point[] => [
      [p[0] - sizes[i][0] / 2, p[1] - sizes[i][1] / 2],
      [p[0] + sizes[i][0] / 2, p[1] + sizes[i][1] / 2]
    ])
  )
  return positions.map((p) => [
    p[0] - (extent[0] + extent[2]) / 2,
    p[1] - (extent[1] + extent[3]) / 2
  ])
}
