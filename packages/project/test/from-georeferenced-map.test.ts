import { describe, expect, test } from 'vitest'

import { ProjectedGcpTransformer } from '../src/index.js'
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'
import { gcps10 } from './input/gcps.js'
import { epsg28992, epsg31370, epsg4326 } from './input/projections.js'

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

describe('ProjectedGcpTransformer.fromGeoreferencedMap', () => {
  test.each([
    [1, 'polynomial1'],
    [2, 'polynomial2'],
    [3, 'polynomial3']
  ] as const)('preserves polynomial order %i', (order, transformationType) => {
    const transformer = ProjectedGcpTransformer.fromGeoreferencedMap({
      ...georeferencedMap,
      transformation: { type: 'polynomial', options: { order } }
    })
    const expectedTransformer = new ProjectedGcpTransformer(
      gcps10,
      transformationType
    )

    expect(transformer.type).toBe(transformationType)
    expectToBeCloseToArray(
      transformer.transformToProjectedGeo([8000, 5000]),
      expectedTransformer.transformToProjectedGeo([8000, 5000])
    )
    expectToBeCloseToArray(
      transformer.transformToResource([-333958, 7170156]),
      expectedTransformer.transformToResource([-333958, 7170156])
    )
  })

  test('defaults to polynomial when no transformation is supplied', () => {
    expect(
      ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap).type
    ).toBe('polynomial')
  })

  test('defaults to first order when no polynomial order is supplied', () => {
    const transformer = ProjectedGcpTransformer.fromGeoreferencedMap({
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
    const transformer = ProjectedGcpTransformer.fromGeoreferencedMap({
      ...georeferencedMap,
      transformation: { type }
    })

    expect(transformer.type).toBe(type)
  })

  test('preserves the resource CRS and allows explicit option overrides', () => {
    const map: GeoreferencedMap = {
      ...georeferencedMap,
      transformation: { type: 'polynomial', options: { order: 3 } },
      resourceCrs: epsg31370
    }
    expect(
      ProjectedGcpTransformer.fromGeoreferencedMap(map).internalProjection
    ).toEqual(epsg31370)

    const options = {
      transformationType: 'polynomial2' as const,
      internalProjection: epsg28992,
      projection: epsg4326,
      differentHandedness: false
    }
    const transformer = ProjectedGcpTransformer.fromGeoreferencedMap(
      map,
      options
    )
    const expectedTransformer = new ProjectedGcpTransformer(
      gcps10,
      'polynomial2',
      options
    )

    expect(transformer.type).toBe('polynomial2')
    expect(transformer.internalProjection).toEqual(epsg28992)
    expect(transformer.projection).toEqual(epsg4326)
    expectToBeCloseToArray(
      transformer.transformToProjectedGeo([8000, 5000]),
      expectedTransformer.transformToProjectedGeo([8000, 5000])
    )
  })
})
