import { describe, expect, test } from 'vitest'

import { GcpTransformer } from '../src/index.js'
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'
import { gcps10 } from './input/gcps.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

const georeferencedMap: GeoreferencedMap = {
  type: 'GeoreferencedMap',
  resource: { id: 'https://example.org/image', type: 'ImageService3' },
  gcps: gcps10,
  resourceMask: [
    [0, 0],
    [14000, 0],
    [14000, 10000],
    [0, 10000]
  ]
}

describe('GcpTransformer.fromGeoreferencedMap', () => {
  test.each([
    [1, 'polynomial1'],
    [2, 'polynomial2'],
    [3, 'polynomial3']
  ] as const)('preserves polynomial order %i', (order, transformationType) => {
    const transformer = GcpTransformer.fromGeoreferencedMap({
      ...georeferencedMap,
      transformation: { type: 'polynomial', options: { order } }
    })
    const expectedTransformer = new GcpTransformer(gcps10, transformationType)

    expect(transformer.type).toBe(transformationType)
    expectToBeCloseToArray(
      transformer.transformToGeo([8000, 5000]),
      expectedTransformer.transformToGeo([8000, 5000])
    )
    expectToBeCloseToArray(
      transformer.transformToResource([-3, 54]),
      expectedTransformer.transformToResource([-3, 54])
    )
  })

  test('defaults to polynomial when no transformation is supplied', () => {
    expect(GcpTransformer.fromGeoreferencedMap(georeferencedMap).type).toBe(
      'polynomial'
    )
  })

  test('defaults to first order when no polynomial order is supplied', () => {
    const transformer = GcpTransformer.fromGeoreferencedMap({
      ...georeferencedMap,
      transformation: { type: 'polynomial' }
    })

    expect(transformer.type).toBe('polynomial1')
  })

  test.each([
    'straight',
    'helmert',
    'thinPlateSpline',
    'projective',
    'linear'
  ] as const)('preserves transformation type %s', (type) => {
    const transformer = GcpTransformer.fromGeoreferencedMap({
      ...georeferencedMap,
      transformation: { type }
    })

    expect(transformer.type).toBe(type)
  })

  test('allows an explicit transformation type to override the map', () => {
    const transformer = GcpTransformer.fromGeoreferencedMap(
      {
        ...georeferencedMap,
        transformation: { type: 'polynomial', options: { order: 3 } }
      },
      { transformationType: 'polynomial2', differentHandedness: false }
    )
    const expectedTransformer = new GcpTransformer(gcps10, 'polynomial2', {
      differentHandedness: false
    })

    expect(transformer.type).toBe('polynomial2')
    expectToBeCloseToArray(
      transformer.transformToGeo([8000, 5000]),
      expectedTransformer.transformToGeo([8000, 5000])
    )
  })
})
