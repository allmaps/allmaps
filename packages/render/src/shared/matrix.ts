import type { Transform, Position, Matrix4 } from './types.js'

export function applyTransform(
  transform: Transform,
  coordinate: Position
): Position {
  const x = coordinate[0]
  const y = coordinate[1]

  return [
    transform[0] * x + transform[2] * y + transform[4],
    transform[1] * x + transform[3] * y + transform[5]
  ]
}

export function createTransform(): Transform {
  return [1, 0, 0, 1, 0, 0]
}

export function multiplyTransform(
  transform1: Transform,
  transform2: Transform
): Transform {
  const a1 = transform1[0]
  const b1 = transform1[1]
  const c1 = transform1[2]
  const d1 = transform1[3]
  const e1 = transform1[4]
  const f1 = transform1[5]
  const a2 = transform2[0]
  const b2 = transform2[1]
  const c2 = transform2[2]
  const d2 = transform2[3]
  const e2 = transform2[4]
  const f2 = transform2[5]

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1
  ]
}

export function rotateTransform(
  transform: Transform,
  angle: number
): Transform {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return multiplyTransform(transform, [cos, sin, -sin, cos, 0, 0])
}

export function scaleTransform(
  transform: Transform,
  x: number,
  y: number
): Transform {
  return multiplyTransform(transform, [x, 0, 0, y, 0, 0])
}

export function translateTransform(
  transform: Transform,
  dx: number,
  dy: number
): Transform {
  return multiplyTransform(transform, [1, 0, 0, 1, dx, dy])
}

export function composeTransform(
  dx1: number,
  dy1: number,
  sx: number,
  sy: number,
  angle: number,
  dx2: number,
  dy2: number
): Transform {
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

export function invertTransform(source: Transform): Transform {
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

export function getDeterminant(mat: Transform): number {
  return mat[0] * mat[3] - mat[1] * mat[2]
}

export function transformToMatrix4(transform: Transform): Matrix4 {
  let matrix4: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

  matrix4[0] = transform[0]
  matrix4[1] = transform[1]
  matrix4[4] = transform[2]
  matrix4[5] = transform[3]
  matrix4[12] = transform[4]
  matrix4[13] = transform[5]

  return matrix4
}
