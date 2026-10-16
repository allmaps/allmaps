import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyMatrix,
  invertMatrix,
  transformMatrix,
  matrixValues,
  decomposeTransform,
  dragTransform,
  snapTransform
} from '../src/lib/affine-transform.ts'
import type { Point } from '@allmaps/types'

function close(a: Point, b: Point) {
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-8, `${a} != ${b}`)
}

test('affine decomposition reconstructs rotated, reflected and unequal-scale imports with both shears', () => {
  for (const sign of [-1, 1])
    for (const angle of [0, 0.8, -2.4]) {
      const basis: [Point, Point] = [
        [3 * Math.cos(angle), 3 * Math.sin(angle)],
        [-sign * 3 * Math.sin(angle), sign * 3 * Math.cos(angle)]
      ]
      const axes = transformMatrix({
        scaleX: 1.5,
        scaleY: 0.6,
        skewX: 0.4,
        skewY: -0.2
      }).map((p) => applyMatrix(basis, p))
      const result = decomposeTransform(axes[0], axes[1])
      transformMatrix(result.values).forEach((p, i) =>
        close(applyMatrix(result.basis, p), axes[i])
      )
      close(
        applyMatrix(
          invertMatrix(result.basis),
          applyMatrix(result.basis, [30, 17])
        ),
        [30, 17]
      )
    }
})

test('unlocked corners scale both axes and side handles scale only their axis', () => {
  const start = { scaleX: 1.2, scaleY: 0.8, skewX: 0.4, skewY: -0.2 }
  const both = dragTransform(start, [800, 600], [0.2, -0.25], [1, 1], 'scale')
  close([both.scaleX, both.scaleY], [1.44, 0.6])
  const x = dragTransform(start, [800, 600], [-0.2, 0.5], [-1, 0], 'scale')
  close([x.scaleX, x.scaleY], [1.44, 0.8])
  const proportional = dragTransform(
    start,
    [800, 600],
    [0.2, 0.3],
    [1, 1],
    'scale',
    true
  )
  close([proportional.scaleX, proportional.scaleY], [1.5, 1])
  assert.ok(
    dragTransform(start, [800, 600], [-3, 0], [1, 0], 'scale').scaleX > 0
  )
})

test('proportional scaling uses one factor for every corner and midpoint, including skewed maps', () => {
  const start = { scaleX: 1.2, scaleY: 0.8, skewX: 0.4, skewY: -0.2 }
  const matrix = transformMatrix(start)
  for (const direction of [
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0]
  ] as Point[]) {
    for (const delta of [
      [0.2, 0.3],
      [-3, -2]
    ] as Point[]) {
      const values = dragTransform(
        start,
        [800, 600],
        delta,
        direction,
        'scale',
        true
      )
      const factor = values.scaleX / start.scaleX
      assert.ok(factor > 0)
      close([factor, values.scaleY / start.scaleY], [factor, factor])
      transformMatrix(values).forEach((axis, i) =>
        close(axis, [matrix[i][0] * factor, matrix[i][1] * factor])
      )
    }
  }
  const right = dragTransform(
    start,
    [800, 600],
    [0.2, 0.3],
    [1, 0],
    'scale',
    true
  )
  close([right.scaleX, right.scaleY], [1.44, 0.96])
  const top = dragTransform(
    start,
    [800, 600],
    [0.2, -0.3],
    [0, -1],
    'scale',
    true
  )
  close([top.scaleX, top.scaleY], [1.56, 1.04])
})

test('scale detents preserve locked proportions and existing shear near imported and neutral values', () => {
  const start = { scaleX: 1.8, scaleY: 0.7, skewX: 0.004, skewY: -0.003 }
  const imported = { scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 }
  for (const factor of [1.004, 1 / start.scaleX + 0.001, 1.7]) {
    const values = {
      ...start,
      scaleX: start.scaleX * factor,
      scaleY: start.scaleY * factor
    }
    const snapped = snapTransform(values, start, imported, 'scale', true)
    close(
      [snapped.scaleX / start.scaleX, snapped.scaleY / start.scaleY],
      [snapped.scaleX / start.scaleX, snapped.scaleX / start.scaleX]
    )
    assert.equal(snapped.skewX, start.skewX)
    assert.equal(snapped.skewY, start.skewY)
    if (factor === 1.004) assert.deepEqual(snapped, start)
    if (factor === 1 / start.scaleX + 0.001) assert.equal(snapped.scaleX, 1)
    if (factor === 1.7) assert.deepEqual(snapped, values)
  }
  const nearNeutral = { ...start, scaleX: 0.996, scaleY: 1.004 }
  assert.deepEqual(snapTransform(nearNeutral, start, imported, 'scale'), {
    ...start,
    scaleX: 1,
    scaleY: 1
  })
})

test('dragging each box edge shears along that edge and preserves area', () => {
  const start = { scaleX: 1.2, scaleY: 0.8, skewX: 0.4, skewY: -0.2 }
  const [x, y] = transformMatrix(start)
  for (const side of [-1, 1]) {
    const horizontal = dragTransform(
      start,
      [800, 600],
      [0.2, 0],
      [0, side],
      'skew'
    )
    const h = transformMatrix(horizontal)
    close(h[0], x)
    close(h[1], [
      y[0] + ((side * 0.2 * 800) / 600) * x[0],
      y[1] + ((side * 0.2 * 800) / 600) * x[1]
    ])
    const vertical = dragTransform(
      start,
      [800, 600],
      [0, 0.2],
      [side, 0],
      'skew'
    )
    const v = transformMatrix(vertical)
    close(v[1], y)
    close(v[0], [
      x[0] + ((side * 0.2 * 600) / 800) * y[0],
      x[1] + ((side * 0.2 * 600) / 800) * y[1]
    ])
    assert.ok(
      Math.abs(
        horizontal.scaleX * horizontal.scaleY - start.scaleX * start.scaleY
      ) < 1e-8
    )
    assert.ok(
      Math.abs(
        vertical.scaleX * vertical.scaleY - start.scaleX * start.scaleY
      ) < 1e-8
    )
    assert.deepEqual(matrixValues(v), vertical)
  }
})
