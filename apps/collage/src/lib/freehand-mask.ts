import type { Point } from '@allmaps/types'
import { validateResourceMask } from './model.ts'

/** Douglas–Peucker simplification in screen pixels, following the ring
 * simplification in packages/frame. Keep original image coordinates at retained
 * vertices; split the closed ring into two open paths to avoid a zero-length
 * baseline. Fall back to the stroke if simplifying changes its topology. */
export function simplifyMaskStroke(
  stroke: Point[],
  width: number,
  height: number,
  project: (p: Point) => Point,
  tolerance = 2
): Point[] {
  const points = stroke.filter(
    (p, i) =>
      !i || Math.hypot(p[0] - stroke[i - 1][0], p[1] - stroke[i - 1][1]) > 1e-6
  )
  if (
    points.length > 1 &&
    Math.hypot(
      points[0][0] - points.at(-1)![0],
      points[0][1] - points.at(-1)![1]
    ) < 1e-6
  )
    points.pop()
  if (points.length < 3) throw new Error('Draw a closed area with the pen.')
  validateResourceMask(points, width, height)
  const screen = points.map(project)
  let split = 1
  for (let i = 2; i < screen.length; i++)
    if (
      Math.hypot(screen[i][0] - screen[0][0], screen[i][1] - screen[0][1]) >
      Math.hypot(
        screen[split][0] - screen[0][0],
        screen[split][1] - screen[0][1]
      )
    )
      split = i
  const keep = new Set([0, split, points.length])
  const closed = [...screen, screen[0]]
  const pending = [
    [0, split],
    [split, points.length]
  ]
  while (pending.length) {
    const [start, end] = pending.pop()!
    const a = closed[start],
      b = closed[end]
    const dx = b[0] - a[0],
      dy = b[1] - a[1]
    let farthest = -1,
      maximum = tolerance * tolerance
    for (let i = start + 1; i < end; i++) {
      const p = closed[i]
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)
        )
      )
      const distance = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2
      if (distance > maximum) {
        maximum = distance
        farthest = i
      }
    }
    if (farthest !== -1) {
      keep.add(farthest)
      pending.push([start, farthest], [farthest, end])
    }
  }
  const simplified = points.filter((_, i) => keep.has(i))
  try {
    validateResourceMask(simplified, width, height)
    return simplified
  } catch {
    validateResourceMask(points, width, height)
    return points
  }
}
