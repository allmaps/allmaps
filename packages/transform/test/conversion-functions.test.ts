import { describe, expect, test } from 'vitest'

import {
  transformationTypeToTypeAndOrder,
  typeAndOrderToTransformationType
} from '../src/index.js'

describe('typeAndOrderToTransformationType', () => {
  test.each([1, 2, 3])('preserves polynomial order %i', (order) => {
    expect(
      typeAndOrderToTransformationType({
        type: 'polynomial',
        options: { order }
      })
    ).toBe(`polynomial${order}`)
  })

  test.each([undefined, {}, { order: 1 }, { order: 4 }])(
    'defaults to polynomial1 for options %j',
    (options) => {
      expect(
        typeAndOrderToTransformationType({ type: 'polynomial', options })
      ).toBe('polynomial1')
    }
  )

  test.each([
    'polynomial1',
    'polynomial2',
    'polynomial3',
    'straight',
    'helmert',
    'thinPlateSpline',
    'projective',
    'linear'
  ] as const)('round-trips %s', (transformationType) => {
    expect(
      typeAndOrderToTransformationType(
        transformationTypeToTypeAndOrder(transformationType)
      )
    ).toBe(transformationType)
  })

  test.each(['polynomial1', 'polynomial2', 'polynomial3'])(
    'preserves explicit type %s over an order option',
    (type) => {
      expect(
        typeAndOrderToTransformationType({ type, options: { order: 3 } })
      ).toBe(type)
    }
  )

  test('rejects an unrecognised transformation type', () => {
    expect(() => typeAndOrderToTransformationType({ type: 'unknown' })).toThrow(
      'Unrecognised transformationType.'
    )
  })
})
