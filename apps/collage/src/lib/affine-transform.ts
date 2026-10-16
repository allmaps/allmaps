import type { Point } from '@allmaps/types'

export type TransformValues = {
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
}
// Column vectors, in resource coordinates. Positive scales preserve handedness.
export type Matrix = [Point, Point]
export const neutralTransform: TransformValues = {
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0
}

export function transformMatrix(v: TransformValues): Matrix {
  if (
    !Object.values(v).every(Number.isFinite) ||
    v.scaleX <= 0 ||
    v.scaleY <= 0
  )
    throw new Error('Scale must be positive and the transformation finite.')
  return [
    [v.scaleX, v.scaleX * v.skewY],
    [v.scaleY * v.skewX, v.scaleY * (1 + v.skewX * v.skewY)]
  ]
}
export function applyMatrix([x, y]: Matrix, p: Point): Point {
  return [x[0] * p[0] + y[0] * p[1], x[1] * p[0] + y[1] * p[1]]
}
export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  return [applyMatrix(a, b[0]), applyMatrix(a, b[1])]
}
export function invertMatrix([x, y]: Matrix): Matrix {
  const det = x[0] * y[1] - x[1] * y[0]
  if (!Number.isFinite(det) || Math.abs(det) < 1e-20)
    throw new Error('This transformation is too small to edit.')
  return [
    [y[1] / det, -x[1] / det],
    [-y[0] / det, x[0] / det]
  ]
}
export function matrixValues([x, y]: Matrix): TransformValues {
  const scaleX = x[0]
  const scaleY = (x[0] * y[1] - x[1] * y[0]) / scaleX
  const values = { scaleX, scaleY, skewX: y[0] / scaleY, skewY: x[1] / scaleX }
  transformMatrix(values)
  return values
}

/** Polar rotation + area-equivalent uniform scale give an unambiguous neutral
 * reference. The remaining affine matrix supplies both shears and axis scales. */
export function decomposeTransform(x: Point, y: Point) {
  const det = x[0] * y[1] - x[1] * y[0]
  const sign = Math.sign(det)
  const scale = Math.sqrt(Math.abs(det))
  const angle = Math.atan2(x[1] - sign * y[0], x[0] + sign * y[1])
  const c = Math.cos(angle) * scale,
    s = Math.sin(angle) * scale
  const basis: Matrix = [
    [c, s],
    [-sign * s, sign * c]
  ]
  const inverse = invertMatrix(basis)
  return {
    basis,
    values: matrixValues([applyMatrix(inverse, x), applyMatrix(inverse, y)])
  }
}

export function reflectedValues(values: TransformValues): TransformValues {
  return { ...values, skewX: -values.skewX, skewY: -values.skewY }
}

/** Delta is measured in the starting frame's edge vectors, so camera rotation,
 * zoom, imported shear and unequal scales do not change pointer behavior. */
export function dragTransform(
  start: TransformValues,
  size: Point,
  delta: Point,
  handle: Point,
  kind: 'scale' | 'skew',
  proportional = false
): TransformValues {
  if (kind === 'scale') {
    let x = handle[0] ? Math.max(0.02, 1 + handle[0] * delta[0]) : 1
    let y = handle[1] ? Math.max(0.02, 1 + handle[1] * delta[1]) : 1
    if (proportional)
      x = y = handle[0] && handle[1] ? (x + y) / 2 : handle[0] ? x : y
    return { ...start, scaleX: start.scaleX * x, scaleY: start.scaleY * y }
  }
  const [x, y] = transformMatrix(start)
  if (handle[1]) {
    const k = (delta[0] * handle[1] * size[0]) / size[1]
    return matrixValues([x, [y[0] + k * x[0], y[1] + k * x[1]]])
  }
  const k = (delta[1] * handle[0] * size[1]) / size[0]
  return matrixValues([[x[0] + k * y[0], x[1] + k * y[1]], y])
}

/** Small detents at imported/neutral values, without changing proportions or
 * shear during a scale gesture. Proportional scaling snaps one shared factor. */
export function snapTransform(
  values: TransformValues,
  start: TransformValues,
  imported: TransformValues,
  kind: 'scale' | 'skew',
  proportional = false
): TransformValues {
  const result = { ...values }
  const scaleKeys = ['scaleX', 'scaleY'] as const
  if (kind === 'scale' && proportional) {
    const factor = values.scaleX / start.scaleX
    let snapped = factor
    let nearest = 0.008 / Math.max(start.scaleX, start.scaleY)
    const targets = [
      1,
      ...scaleKeys.flatMap((key) => [
        1 / start[key],
        imported[key] / start[key]
      ])
    ]
    for (const target of targets) {
      const distance = Math.abs(factor - target)
      if (distance < nearest) {
        nearest = distance
        snapped = target
      }
    }
    result.scaleX = start.scaleX * snapped
    result.scaleY = start.scaleY * snapped
  } else {
    const keys =
      kind === 'scale'
        ? scaleKeys
        : (Object.keys(values) as (keyof TransformValues)[])
    for (const key of keys)
      for (const target of [neutralTransform[key], imported[key]])
        if (Math.abs(values[key] - target) < 0.008) result[key] = target
  }
  return result
}
