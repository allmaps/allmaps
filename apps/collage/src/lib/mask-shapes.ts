import type { Point } from '@allmaps/types'
import { bounds } from './geometry.ts'

/** Draw a circle in the chosen plane (view or image), then store it in image
 * coordinates. An image-space circle follows the map's scale and shear. */
export function drawMaskCircle(
  start: Point,
  end: Point,
  width: number,
  height: number,
  toResource?: (point: Point) => Point
): Point[] {
  if (!toResource) {
    start = [
      Math.max(0, Math.min(width, start[0])),
      Math.max(0, Math.min(height, start[1]))
    ]
  }
  const project = toResource ?? ((point: Point) => point)
  const radius = Math.hypot(end[0] - start[0], end[1] - start[1])
  const mask = Array.from({ length: 128 }, (_, i): Point => {
    const angle = (i * 2 * Math.PI) / 128
    return project([
      start[0] + radius * Math.cos(angle),
      start[1] + radius * Math.sin(angle)
    ])
  })
  return fitMaskToImage(mask, project(start), width, height)
}

/** Draw a rectangle in the chosen plane, then store its corners in the image.
 * Omitting the projection aligns its sides with the original image's axes. */
export function drawMaskRectangle(
  start: Point,
  end: Point,
  width: number,
  height: number,
  toResource: (point: Point) => Point = (point) => point
): Point[] {
  const [left, top, right, bottom] = bounds([start, end])
  const corners: Point[] = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom]
  ]
  return fitMaskToImage(
    corners.map(toResource),
    toResource(start),
    width,
    height
  )
}

/** Affine transforms let us shrink the entire shape at the first image boundary
 * without changing its shape in either plane. The anchor must be in the image. */
function fitMaskToImage(
  mask: Point[],
  anchor: Point,
  width: number,
  height: number
): Point[] {
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
