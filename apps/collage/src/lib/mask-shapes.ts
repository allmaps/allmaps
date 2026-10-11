import type { Point } from '@allmaps/types'
import { bounds } from './geometry.ts'

/** Keep the whole circle inside the image when the drag reaches its edge. */
export function drawMaskCircle(
  start: Point,
  end: Point,
  width: number,
  height: number
): Point[] {
  const a: Point = [
    Math.max(0, Math.min(width, start[0])),
    Math.max(0, Math.min(height, start[1]))
  ]
  const radius = Math.min(
    Math.hypot(end[0] - a[0], end[1] - a[1]),
    a[0],
    a[1],
    width - a[0],
    height - a[1]
  )
  return Array.from({ length: 128 }, (_, i): Point => {
    const angle = (i * 2 * Math.PI) / 128
    return [a[0] + radius * Math.cos(angle), a[1] + radius * Math.sin(angle)]
  })
}

/** Draw between view coordinates, then store the corners in image coordinates.
 * Collage's affine transforms let us shrink around the anchor at the first
 * image boundary without skewing the rectangle or changing its orientation. */
export function drawMaskRectangle(
  start: Point,
  end: Point,
  width: number,
  height: number,
  toResource: (point: Point) => Point
): Point[] {
  const [left, top, right, bottom] = bounds([start, end])
  const corners: Point[] = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom]
  ]
  const anchor = toResource(start)
  const mask = corners.map(toResource)
  let fraction = 1
  for (const point of mask) {
    for (const [axis, limit] of [width, height].entries()) {
      const delta = point[axis] - anchor[axis]
      if (point[axis] < 0) fraction = Math.min(fraction, -anchor[axis] / delta)
      else if (point[axis] > limit)
        fraction = Math.min(fraction, (limit - anchor[axis]) / delta)
    }
  }
  return mask.map(
    (point) =>
      point.map((value, axis) =>
        Math.max(
          0,
          Math.min(
            [width, height][axis],
            anchor[axis] + fraction * (value - anchor[axis])
          )
        )
      ) as Point
  )
}

/** Translate rigidly: stop the whole mask at the first image boundary. */
export function moveMask(
  mask: Point[],
  delta: Point,
  width: number,
  height: number
): Point[] {
  const [left, top, right, bottom] = bounds(mask)
  const dx = Math.max(-left, Math.min(width - right, delta[0]))
  const dy = Math.max(-top, Math.min(height - bottom, delta[1]))
  return mask.map(([x, y]) => [x + dx, y + dy])
}

export function maskContains(mask: Point[], point: Point): boolean {
  let inside = false
  for (let i = 0, j = mask.length - 1; i < mask.length; j = i++) {
    const a = mask[i],
      b = mask[j]
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}
