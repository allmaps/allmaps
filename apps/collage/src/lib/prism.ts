import { Delaunay } from 'd3-delaunay'
import type { Point } from '@allmaps/types'
import { packBoxes } from './geometry.ts'

export type LayoutBox = { x: number; y: number; w: number; h: number }
type Edge = { i: number; j: number; weight: number; ideal: number }
type Vector = number[] | Float64Array

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])

export function overlaps(
  boxes: LayoutBox[],
  positions: Point[],
  gap = 0
): Point[] {
  const pairs: Point[] = []
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (
        Math.abs(positions[i][0] - positions[j][0]) <
          (boxes[i].w + boxes[j].w) / 2 + gap - 1e-6 &&
        Math.abs(positions[i][1] - positions[j][1]) <
          (boxes[i].h + boxes[j].h) / 2 + gap - 1e-6
      )
        pairs.push([i, j])
    }
  }
  return pairs
}

function proximityEdges(positions: Point[]) {
  const triangulation = Delaunay.from(positions)
  const edges = new Map<string, Point>()
  const add = (i: number, j: number) => {
    if (i === j) return
    const pair: Point = [Math.min(i, j), Math.max(i, j)]
    edges.set(pair.join(':'), pair)
  }
  positions.forEach((_, i) => {
    for (const j of triangulation.neighbors(i)) add(i, j)
  })
  return edges
}

function dot(a: Vector, b: Vector) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

// Solve a weighted graph Laplacian with node 0 fixed at (0, 0).
// Preconditioned conjugate gradients avoids a dense O(n^3) solve.
function solve(
  edges: Edge[],
  diagonal: Float64Array,
  rhs: Float64Array,
  initial: number[]
) {
  const result = new Float64Array(initial.length)
  const multiply = (x: Float64Array) => {
    result.fill(0)
    for (const { i, j, weight } of edges) {
      const delta = weight * (x[i] - x[j])
      if (i) result[i] += delta
      if (j) result[j] -= delta
    }
    return result
  }
  const x = Float64Array.from(initial)
  x[0] = 0
  const ax = multiply(x)
  const r = Float64Array.from(rhs, (value, i) => (i ? value - ax[i] : 0))
  const z = Float64Array.from(r, (value, i) => value / (diagonal[i] || 1))
  const direction = Float64Array.from(z)
  let rz = dot(r, z)
  const tolerance = Math.max(1e-20, dot(rhs, rhs) * 1e-16)
  for (let step = 0; step < x.length * 2 && dot(r, r) > tolerance; step++) {
    const ad = multiply(direction)
    const denominator = dot(direction, ad)
    if (!(denominator > 0)) break
    const alpha = rz / denominator
    for (let i = 1; i < x.length; i++) {
      x[i] += alpha * direction[i]
      r[i] -= alpha * ad[i]
      z[i] = r[i] / diagonal[i]
    }
    const next = dot(r, z)
    const beta = next / rz
    for (let i = 1; i < x.length; i++) direction[i] = z[i] + beta * direction[i]
    rz = next
  }
  return x
}

function stress(positions: Point[], edges: Edge[]) {
  return edges.reduce(
    (sum, edge) =>
      sum +
      edge.weight *
        (distance(positions[edge.i], positions[edge.j]) - edge.ideal) ** 2,
    0
  )
}

// Implementation of Gansner & Hu (2010), Algorithm 1, eqs. 5–7:
// https://www.graphviz.org/documentation/GH10.pdf
// Rebuild Delaunay proximity edges; damp expansion to 1.5; minimize weighted
// stress by majorization; then include every residual overlap in a second phase.
// Limits and tolerances match the layout experiment. Run this in a worker.
function prism(boxes: LayoutBox[], gap: number) {
  let positions: Point[] = boxes.map((box) => [
    box.x - boxes[0].x,
    box.y - boxes[0].y
  ])
  let iterations = 0
  let phase = 0
  for (; iterations < 300; iterations++) {
    const collisions = overlaps(boxes, positions, gap)
    if (!collisions.length) break
    const proximity = proximityEdges(positions)
    if (!phase && !collisions.some((pair) => proximity.has(pair.join(':'))))
      phase = 1
    if (phase)
      for (const pair of collisions) proximity.set(pair.join(':'), pair)
    const diagonal = new Float64Array(boxes.length)
    const edges = [...proximity.values()].map(([i, j]) => {
      const dx = Math.abs(positions[i][0] - positions[j][0])
      const dy = Math.abs(positions[i][1] - positions[j][1])
      const factor = Math.max(
        1,
        Math.min(
          ((boxes[i].w + boxes[j].w) / 2 + gap) / (dx || Number.MIN_VALUE),
          ((boxes[i].h + boxes[j].h) / 2 + gap) / (dy || Number.MIN_VALUE)
        )
      )
      // Slightly overshoot a touching target, as finite stress tolerances can
      // otherwise leave microscopic gap violations indefinitely.
      const expansion = factor > 1 ? Math.min(1.5, factor * 1.001) : 1
      const ideal =
        Math.max(1e-8, distance(positions[i], positions[j])) * expansion
      const weight = 1 / ideal ** 2
      diagonal[i] += weight
      diagonal[j] += weight
      return { i, j, ideal, weight }
    })
    let previous = stress(positions, edges)
    for (let inner = 0; inner < 50; inner++) {
      const bx = new Float64Array(boxes.length)
      const by = new Float64Array(boxes.length)
      for (const { i, j, ideal, weight } of edges) {
        const ratio =
          (weight * ideal) /
          Math.max(1e-12, distance(positions[i], positions[j]))
        const x = ratio * (positions[i][0] - positions[j][0])
        const y = ratio * (positions[i][1] - positions[j][1])
        bx[i] += x
        bx[j] -= x
        by[i] += y
        by[j] -= y
      }
      bx[0] = by[0] = 0
      const x = solve(
        edges,
        diagonal,
        bx,
        positions.map((p) => p[0])
      )
      const y = solve(
        edges,
        diagonal,
        by,
        positions.map((p) => p[1])
      )
      const next: Point[] = positions.map((_, i) => [x[i], y[i]])
      const current = stress(next, edges)
      if (current > previous + 1e-8) break
      positions = next
      if (previous - current < Math.max(1e-9, previous * 1e-5)) break
      previous = current
    }
  }
  return {
    positions: positions.map<Point>((p) => [
      p[0] + boxes[0].x,
      p[1] + boxes[0].y
    ]),
    iterations,
    capped: iterations === 300
  }
}

function prepare(boxes: LayoutBox[]) {
  // Normalize numerical units, never map dimensions relative to positions.
  const unit =
    Math.sqrt(boxes.reduce((sum, b) => sum + b.w * b.h, 0) / boxes.length) /
      100 || 1
  const origin = boxes.length ? [boxes[0].x, boxes[0].y] : [0, 0]
  const scaled = boxes.map((b) => ({
    ...b,
    x: (b.x - origin[0]) / unit,
    y: (b.y - origin[1]) / unit,
    w: b.w / unit,
    h: b.h / unit
  }))
  // Deterministic small perturbation for coincident centers, same for both.
  const seen: Point[] = []
  scaled.forEach((box, index) => {
    if (seen.some((p) => distance(p, [box.x, box.y]) < 1e-5)) {
      const angle = index * Math.PI * (3 - Math.sqrt(5))
      // Stay above MSAGL's geometric tolerances. Smaller 1e-4 offsets made
      // its triangulation fail on 20 coincident centers in this experiment.
      const radius = 0.1 * Math.sqrt(index + 1)
      box.x += Math.cos(angle) * radius
      box.y += Math.sin(angle) * radius
    }
    seen.push([box.x, box.y])
  })
  return { boxes: scaled, unit, origin }
}

function anchored(positions: Point[], original: Point[]): Point[] {
  if (!positions.length) return []
  return positions.map((p) => [
    p[0] - positions[0][0] + original[0][0],
    p[1] - positions[0][1] + original[0][1]
  ])
}

function layoutExtent(boxes: LayoutBox[], positions: Point[]) {
  return [
    Math.min(...boxes.map((b, i) => positions[i][0] - b.w / 2)),
    Math.min(...boxes.map((b, i) => positions[i][1] - b.h / 2)),
    Math.max(...boxes.map((b, i) => positions[i][0] + b.w / 2)),
    Math.max(...boxes.map((b, i) => positions[i][1] + b.h / 2))
  ]
}
const area = (boxes: LayoutBox[], positions: Point[]) => {
  const [left, bottom, right, top] = layoutExtent(boxes, positions)
  return (right - left) * (top - bottom)
}

/** Compaction around the first map. Only center distances are
 * compressed; fixed box dimensions and the requested gap are never scaled.
 * Start with ordinary PRISM, target 50% padded-box occupancy, then use PRISM
 * again to resolve the collisions introduced by moving the centers closer.
 */
function compactPrism(boxes: LayoutBox[], gap: number) {
  const baseline = prism(boxes, gap)
  if (boxes.length < 2) return baseline
  const padded = boxes.map((box) => ({
    ...box,
    w: box.w + gap,
    h: box.h + gap
  }))
  const targetArea = padded.reduce((sum, box) => sum + box.w * box.h, 0) / 0.5
  const originalArea = area(boxes, baseline.positions)
  const compaction = {
    applied: false,
    centerScale: 1,
    targetPaddedFill: 0.5,
    areaReduction: 0
  }
  if (area(padded, baseline.positions) <= targetArea)
    return { ...baseline, compaction }

  const anchor = baseline.positions[0]
  const compress = (factor: number) =>
    baseline.positions.map<Point>((point) => [
      anchor[0] + (point[0] - anchor[0]) * factor,
      anchor[1] + (point[1] - anchor[1]) * factor
    ])
  // Solve for a center scale with fixed-size boxes; scaling the whole bounding
  // box would also shrink the maps and overestimate how much space is removed.
  let low = 0
  let high = 1
  for (let step = 0; step < 32; step++) {
    const middle = (low + high) / 2
    if (area(padded, compress(middle)) > targetArea) high = middle
    else low = middle
  }
  const centerScale = Math.max(1e-4, low)
  const centers = compress(centerScale)
  const seed = boxes.map((box, i) => ({
    ...box,
    x: centers[i][0],
    y: centers[i][1]
  }))
  const candidate = prism(seed, gap)
  const candidateArea = area(boxes, candidate.positions)
  const valid =
    candidate.positions.flat().every(Number.isFinite) &&
    !candidate.capped &&
    !overlaps(boxes, candidate.positions, gap).length
  // Retain the known valid layout if the bounded experiment cannot improve it.
  // Record rejection explicitly, so the report never claims it was compacted.
  if (!valid || candidateArea >= originalArea)
    return {
      ...baseline,
      compaction: {
        ...compaction,
        attemptedCenterScale: centerScale,
        reason: valid ? 'No area improvement' : 'Compaction did not converge'
      }
    }
  return {
    ...candidate,
    iterations: baseline.iterations + candidate.iterations,
    compaction: {
      ...compaction,
      applied: true,
      centerScale,
      areaReduction: 1 - candidateArea / originalArea
    }
  }
}

/** Fixed-size, deterministic layout, anchored at the first map. Normalize only
 * numerical units. Reuse solver scratch storage and keep dot products in indexed
 * loops; these optimizations preserve the experiment's exact solver results.
 */
export function compactLayout(boxes: LayoutBox[]): {
  positions: Point[]
  fallback: boolean
} {
  if (
    boxes.some(
      (box) =>
        !Object.values(box).every(Number.isFinite) || box.w <= 0 || box.h <= 0
    )
  )
    throw new Error('Maps need finite, non-empty outlines to arrange them.')
  const original: Point[] = boxes.map((box) => [box.x, box.y])
  if (boxes.length < 2) return { positions: original, fallback: false }
  const { boxes: normalized, unit, origin } = prepare(boxes)
  try {
    const result = compactPrism(normalized, 20)
    if (
      result.capped ||
      !result.positions.flat().every(Number.isFinite) ||
      overlaps(normalized, result.positions, 20).length
    )
      throw new Error('Layout did not converge')
    const positions = anchored(
      result.positions.map((p) => [
        p[0] * unit + origin[0],
        p[1] * unit + origin[1]
      ]),
      original
    )
    return { positions, fallback: false }
  } catch {
    // Keep the previous packer only as a bounded recovery path. The caller tells
    // the user when this is used; it is never exposed as an arrangement option.
    return {
      positions: anchored(
        packBoxes(boxes.map((box) => [box.w, box.h])),
        original
      ),
      fallback: true
    }
  }
}
