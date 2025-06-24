import type { HomogeneousTransform, Point, Matrix4 } from '@allmaps/types'

export function applyHomogeneousTransform(
  homogeneousTransform: HomogeneousTransform,
  coordinate: Point
): Point {
  const x = coordinate[0]
  const y = coordinate[1]

  return [
    homogeneousTransform[0] * x +
      homogeneousTransform[2] * y +
      homogeneousTransform[4],
    homogeneousTransform[1] * x +
      homogeneousTransform[3] * y +
      homogeneousTransform[5]
  ]
}

export function createHomogeneousTransform(): HomogeneousTransform {
  return [1, 0, 0, 1, 0, 0]
}

export function multiplyHomogeneousTransform(
  homogeneousTransform1: HomogeneousTransform,
  homogeneousTransform2: HomogeneousTransform
): HomogeneousTransform {
  const a1 = homogeneousTransform1[0]
  const b1 = homogeneousTransform1[1]
  const c1 = homogeneousTransform1[2]
  const d1 = homogeneousTransform1[3]
  const e1 = homogeneousTransform1[4]
  const f1 = homogeneousTransform1[5]
  const a2 = homogeneousTransform2[0]
  const b2 = homogeneousTransform2[1]
  const c2 = homogeneousTransform2[2]
  const d2 = homogeneousTransform2[3]
  const e2 = homogeneousTransform2[4]
  const f2 = homogeneousTransform2[5]

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1
  ]
}

export function rotateHomogeneousTransform(
  homogeneousTransform: HomogeneousTransform,
  angle: number
): HomogeneousTransform {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return multiplyHomogeneousTransform(homogeneousTransform, [
    cos,
    sin,
    -sin,
    cos,
    0,
    0
  ])
}

export function scaleHomogeneousTransform(
  homogeneousTransform: HomogeneousTransform,
  x: number,
  y: number
): HomogeneousTransform {
  return multiplyHomogeneousTransform(homogeneousTransform, [x, 0, 0, y, 0, 0])
}

export function translateHomogeneousTransform(
  homogeneousTransform: HomogeneousTransform,
  dx: number,
  dy: number
): HomogeneousTransform {
  return multiplyHomogeneousTransform(homogeneousTransform, [
    1,
    0,
    0,
    1,
    dx,
    dy
  ])
}

export function composeHomogeneousTransform(
  dx1: number,
  dy1: number,
  sx: number,
  sy: number,
  angle: number,
  dx2: number,
  dy2: number
): HomogeneousTransform {
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)

  return [
    sx * cos,
    sy * sin,
    -sx * sin,
    sy * cos,
    dx2 * sx * cos - dy2 * sx * sin + dx1,
    dx2 * sy * sin + dy2 * sy * cos + dy1
  ]
}

export function invertHomogeneousTransform(
  source: HomogeneousTransform
): HomogeneousTransform {
  const determinant = getDeterminant(source)

  const a = source[0]
  const b = source[1]
  const c = source[2]
  const d = source[3]
  const e = source[4]
  const f = source[5]

  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    -(a * f - b * e) / determinant
  ]
}

export function getDeterminant(mat: HomogeneousTransform): number {
  return mat[0] * mat[3] - mat[1] * mat[2]
}

export function homogeneousTransformToMatrix4(
  homogeneousTransform: HomogeneousTransform
): Matrix4 {
  const matrix4: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

  matrix4[0] = homogeneousTransform[0]
  matrix4[1] = homogeneousTransform[1]
  matrix4[4] = homogeneousTransform[2]
  matrix4[5] = homogeneousTransform[3]
  matrix4[12] = homogeneousTransform[4]
  matrix4[13] = homogeneousTransform[5]

  return matrix4
}
