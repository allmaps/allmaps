/*!
 * Adapted from iD's actionOrthogonalize and geoOrthoCalcScore:
 * https://github.com/openstreetmap/iD/tree/b08827e5e87a977587f49239fb734a126ac9ea69
 * Closed resource-coordinate masks only; no OSM graph or projection required.
 *
 * ISC License
 * Copyright (c) iD Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */
import type { Point } from '@allmaps/types'
import { bounds } from './geometry.ts'
import { validateResourceMask } from './model.ts'

const epsilon = 1e-4
const lower = Math.cos((77 * Math.PI) / 180)
const upper = Math.cos((13 * Math.PI) / 180)

function corner(points: Point[], i: number) {
  const origin = points[i]
  const a = points[(i + points.length - 1) % points.length]
  const b = points[(i + 1) % points.length]
  const lp = Math.hypot(a[0] - origin[0], a[1] - origin[1])
  const lq = Math.hypot(b[0] - origin[0], b[1] - origin[1])
  const p: Point = [(a[0] - origin[0]) / lp, (a[1] - origin[1]) / lp]
  const q: Point = [(b[0] - origin[0]) / lq, (b[1] - origin[1]) / lq]
  return { p, q, dot: p[0] * q[0] + p[1] * q[1], scale: 2 * Math.min(lp, lq) }
}

function motion(points: Point[], i: number): Point {
  const { p, q, dot, scale } = corner(points, i)
  if (!Number.isFinite(dot) || Math.abs(dot) >= lower) return [0, 0]
  const length = Math.hypot(p[0] + q[0], p[1] + q[1])
  return [
    ((p[0] + q[0]) / length) * 0.1 * dot * scale,
    ((p[1] + q[1]) / length) * 0.1 * dot * scale
  ]
}

function score(points: Point[]) {
  return points.reduce((total, _, i) => {
    const value = Math.abs(corner(points, i).dot)
    if (!Number.isFinite(value)) return Infinity
    return (
      total +
      (value < epsilon || (value >= lower && value <= upper)
        ? 0
        : 2 * Math.min(value, Math.abs(value - 1)))
    )
  }, 0)
}

/** Straighten near-right corners (within 13°), retaining the mask's orientation.
 * Near-straight redundant vertices are removed. Uniform fitting keeps the
 * result inside the image without spoiling right angles. Invalid results throw
 * before the caller changes its draft. */
export function orthogonalizeMask(
  mask: Point[],
  width: number,
  height: number
): Point[] {
  validateResourceMask(mask, width, height)
  let points = mask.map((p) => [...p] as Point)
  if (points.length > 3) {
    const simplified = points.filter((_, i) => corner(points, i).dot >= -upper)
    if (simplified.length >= 3) points = simplified
  }
  const triangle = points.length === 3
  const triangleCorner = points.reduce(
    (best, _, i) =>
      Math.abs(corner(points, i).dot) < Math.abs(corner(points, best).dot)
        ? i
        : best,
    0
  )
  const cost = (p: Point[]) =>
    triangle ? Math.abs(corner(p, triangleCorner).dot) : score(p)
  let best = points.map((p) => [...p] as Point)
  let bestScore = cost(points)
  for (let step = 0; step < 1000 && bestScore > epsilon; step++) {
    const moves = points.map((_, i) =>
      triangle && i !== triangleCorner ? ([0, 0] as Point) : motion(points, i)
    )
    if (moves.every(([x, y]) => x === 0 && y === 0)) break
    points = points.map((p, i) => [p[0] + moves[i][0], p[1] + moves[i][1]])
    const nextScore = cost(points)
    if (nextScore < bestScore) {
      best = points.map((p) => [...p] as Point)
      bestScore = nextScore
    }
  }
  const [left, top, right, bottom] = bounds(best)
  const scale = Math.min(1, width / (right - left), height / (bottom - top))
  const cx = (left + right) / 2,
    cy = (top + bottom) / 2
  const halfWidth = ((right - left) * scale) / 2,
    halfHeight = ((bottom - top) * scale) / 2
  const x = Math.max(halfWidth, Math.min(width - halfWidth, cx))
  const y = Math.max(halfHeight, Math.min(height - halfHeight, cy))
  const result = best.map((p): Point => [
    Math.max(0, Math.min(width, (p[0] - cx) * scale + x)),
    Math.max(0, Math.min(height, (p[1] - cy) * scale + y))
  ])
  validateResourceMask(result, width, height)
  return result
}
