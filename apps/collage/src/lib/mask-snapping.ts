import type { Point } from '@allmaps/types'

export type MaskSnapGuide = { line: [Point, Point]; active: boolean }
export type MaskSnapper = ((delta: Point) => Point) & {
  guides: MaskSnapGuide[]
  origin: boolean
}

const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1]

/** Snap a shared translation along the original incident edges. Only edges
 * crossing from selected to unselected vertices constrain the movement. The
 * projection accounts for zoom, rotation, mirroring and skew; tolerances are
 * CSS pixels. Capture once per drag so guides never follow the edited draft. */
export function createMaskSnapper(
  mask: Point[],
  indices: readonly number[],
  project: (point: Point) => Point
): MaskSnapper {
  const selected = new Set(indices)
  const origins = [...selected].map((index) => mask[index])
  const edges = [...selected].flatMap((index) =>
    [(index + mask.length - 1) % mask.length, (index + 1) % mask.length]
      .filter((neighbor) => !selected.has(neighbor))
      .map((neighbor) => {
        const point = mask[index]
        return {
          point,
          vector: subtract(mask[neighbor], point),
          line: [point, mask[neighbor]] as [Point, Point]
        }
      })
      .filter(({ vector }) => Math.hypot(...vector) > 1e-6)
  )
  let retained: number | undefined
  const snap: MaskSnapper = (delta) => {
    const screens = origins.map(project)
    const projected = edges
      .map((edge) => {
        const screen = project(edge.point)
        return {
          ...edge,
          screen,
          direction: subtract(project(edge.line[1]), screen)
        }
      })
      .filter(({ direction }) => Math.hypot(...direction) > 1e-6)
    const distance = Math.max(
      0,
      ...origins.map((point, index) =>
        Math.hypot(...subtract(project(add(point, delta)), screens[index]))
      )
    )
    snap.origin = !!origins.length && distance <= (snap.origin ? 12 : 8)
    if (snap.origin) {
      retained = undefined
      snap.guides = edges.map(({ line }) => ({ line, active: true }))
      return [0, 0]
    }
    const candidates = projected.map((edge, index) => {
      const movement = subtract(project(add(edge.point, delta)), edge.screen)
      const fraction =
        dot(movement, edge.direction) / dot(edge.direction, edge.direction)
      const next: Point = [edge.vector[0] * fraction, edge.vector[1] * fraction]
      const correction = Math.hypot(
        ...subtract(
          project(add(edge.point, next)),
          project(add(edge.point, delta))
        )
      )
      return { index, next, correction }
    })
    const previous = candidates.find(({ index }) => index === retained)
    const nearest =
      previous && previous.correction <= 12
        ? previous
        : candidates
            .filter(({ correction }) => correction <= 8)
            .sort((a, b) => a.correction - b.correction)[0]
    retained = nearest?.index
    const result = nearest?.next ?? delta
    snap.guides = projected.map(({ line, point, screen, direction }) => {
      const movement = subtract(project(add(point, result)), screen)
      const perpendicular =
        Math.abs(movement[0] * direction[1] - movement[1] * direction[0]) /
        Math.hypot(...direction)
      return { line, active: !!nearest && perpendicular < 0.01 }
    })
    return result
  }
  snap.guides = []
  snap.origin = false
  return snap
}
