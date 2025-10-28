import { describe, expect, test } from 'vitest'

// TODO: move to test helper file in /test/
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'

import { GcpTransformer, GeneralGcpTransformer } from '../src/index.js'

import {
  gcps3,
  generalGcps3Identity,
  generalGcps3Polynomial,
  gcps6,
  gcps10
} from './input/gcps.js'

import { Point } from '@allmaps/types'

describe('Helmert transformation', async () => {
  const generalTransformer = new GeneralGcpTransformer(
    generalGcps3Identity,
    'helmert'
  )
  const sourcePoint: Point = [1, 1]
  const destinationPoint: Point = [1, 1]

  test(`should do an identity transform if input and output coordinates are the same`, () => {
    expectToBeCloseToArray(
      generalTransformer.transformForward(sourcePoint),
      destinationPoint
    )
  })
})

describe('Helmert transformation', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert')
  const resourcePoint: Point = [100, 100]
  // from custom test using https://github.com/mclaeysb/distortionAnalysis/blob/master/functions/helmert.m
  const geoPoint = [4.925027120153211, 52.46506809004473]

  test(`should have the same output as distortionAnalysis Helmert, and respect different handedness automatically`, () => {
    expectToBeCloseToArray(transformer.transformToGeo(resourcePoint), geoPoint)
  })
})

describe('Helmert transformation with different handeness only specified in transformation', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert', {
    differentHandedness: false
  })
  const resourcePoint: Point = [100, 100]
  const geoPoint: Point = [4.925027120153211, 52.46506809004473]

  test(`should have the wrong output since handedness should be specified when building transformer`, () => {
    expect(
      transformer.transformToGeo(resourcePoint, {
        // differentHandedness: true
      })[0]
    ).to.not.be.approximately(geoPoint[0], 0.00001)
  })
})

describe('Helmert backward transformation', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert')
  const resourcePoint: Point = [4.925027120153211, 52.46506809004473]
  const geoPoint = [146.25183291709982, 122.59989116975339]

  test(`should have the correct output, and respect different handedness automatically`, () => {
    expectToBeCloseToArray(
      transformer.transformToResource(resourcePoint),
      geoPoint
    )
  })
})

describe('Helmert backward transformation with flipped y axis', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert')
  const resourcePoint: Point = [4.925027120153211, 52.46506809004473]
  const geoPoint = [146.25183291709982, -122.59989116975339]

  test(`should have the correct output with flipped y axis, and respect different handedness automatically`, () => {
    expectToBeCloseToArray(
      transformer.transformToResource(resourcePoint, {}, (gcp) => [
        gcp.resource[0],
        -gcp.resource[1]
      ]),
      geoPoint
    )
  })
})

describe('Polynomial transformation', async () => {
  const generalTransformer = new GeneralGcpTransformer(
    generalGcps3Polynomial,
    'polynomial'
  )
  const sourcePoint: Point = [1, 1]
  const destinationPoint = [6, 14]

  test(`should do a polynomial transform`, () => {
    expectToBeCloseToArray(
      generalTransformer.transformForward(sourcePoint),
      destinationPoint
    )
  })
})

describe('Polynomial Backward transformation', async () => {
  const generalTransformer = new GeneralGcpTransformer(
    generalGcps3Polynomial,
    'polynomial'
  )
  const sourcePoint: Point = [6, 14]
  const destinationPoint = [1, 1]

  test(`should do a roundtrip backward polynomial transform since there are exactly three GCPs`, () => {
    expectToBeCloseToArray(
      generalTransformer.transformBackward(sourcePoint),
      destinationPoint
    )
  })
})

describe('Polynomial transformation, order 1', async () => {
  const transformer = new GcpTransformer(gcps3, 'polynomial')
  const resourcePoint: Point = [100, 100]
  // from: gdaltransform -output_xy -gcp 518 991 4.9516614 52.4633102 -gcp 4345 2357 5.0480391 52.5123762 -gcp 2647 475 4.9702906 52.5035815
  // with resourcePoint: 100 100
  const geoPoint = [4.92079391286352, 52.4654946986157]

  test(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformToGeo(resourcePoint), geoPoint)
  })
})

describe('Polynomial transformation, order 2', async () => {
  const transformer = new GcpTransformer(gcps6, 'polynomial2')
  const resourcePoint: Point = [1000, 1000]
  // from: gdaltransform -output_xy -order 2 -gcp 1344 4098 4.4091165 51.9017125 -gcp 4440 3441 4.5029222 51.9164451 -gcp 3549 4403 4.4764224 51.897309 -gcp 1794 2130 4.4199066 51.9391509 -gcp 3656 2558 4.4775683 51.9324358 -gcp 2656 3558 4.4572643 51.9143043
  // with resourcePoint: 1000 1000
  const geoPoint = [4.36596042386853, 51.9550430503008]

  test(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformToGeo(resourcePoint), geoPoint)
  })
})

describe('Polynomial transformation, order 3', async () => {
  const transformer = new GcpTransformer(gcps10, 'polynomial3')
  const resourcePoint: Point = [10000, 10000]
  // from: gdaltransform -output_xy -order 3 -gcp 6933 3641 -5.6931398 56.1290282 -gcp 6158 1470 -6.2921755 58.5220974 -gcp 9142 2240 -2.1077545 57.687078 -gcp 9626 9058 -1.5642528 50.6648133 -gcp 8387 1447 -3.0589806 58.6152482 -gcp 11709 8644 1.5829224 50.8667829 -gcp 8995 5647 -2.8041724 54.0553335 -gcp 12903 6620 4.7685316 52.9630668 -gcp 8262 9534 -3.6827528 50.2116403 -gcp 6925 9356 -5.7572694 50.055299
  // with input: 10000 10000
  const geoPoint = [-1.34357085609956, 49.7913344676161]

  test(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformToGeo(resourcePoint), geoPoint)
  })
})

describe('Projective transformation', async () => {
  const transformer = new GcpTransformer(gcps6, 'projective')
  const resourcePoint: Point = [1000, 1000]
  const geoPoint = [4.3996721825549265, 51.957630080558445] // TODO: Check this in a reference implementation

  test(`should have the same output as (TODO: check reference)`, () => {
    expectToBeCloseToArray(transformer.transformToGeo(resourcePoint), geoPoint)
  })
})

describe('Thin plate spline transformation', async () => {
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourcePoint: Point = [1000, 1000]
  // from: gdaltransform -output_xy -tps -gcp 1344 4098 4.4091165 51.9017125 -gcp 4440 3441 4.5029222 51.9164451 -gcp 3549 4403 4.4764224 51.897309 -gcp 1794 2130 4.4199066 51.9391509 -gcp 3656 2558 4.4775683 51.9324358 -gcp 2656 3558 4.4572643 51.9143043
  // with resourcePoint: 1000 1000
  const geoPoint = [4.38895777703007, 51.9590841915719]

  test(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformToGeo(resourcePoint), geoPoint)
  })
})

describe('Thin plate spline transformation distortion', async () => {
  const helmertTransformer = new GcpTransformer(gcps6, 'helmert')
  const toGeoHelmertTransformation = helmertTransformer.getToGeoTransformation()

  // TODO getToGeoTransformation shouldn't return a BaseTransformation but a
  // GeoHelmertTransformation. Until then:
  // @ts-ignore
  const referenceScale = toGeoHelmertTransformation.getMeasures().scale

  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourcePoint: Point = [1000, 1000]
  const distortion = -0.21409071451286568

  test(`should be able to compute distortion`, () => {
    expect(
      transformer.transformToGeo(
        resourcePoint,
        {
          distortionMeasures: ['log2sigma'],
          referenceScale
        },
        (gcpAndDistortions) => gcpAndDistortions.distortions?.get('log2sigma')
      )
    ).to.equal(distortion)
  })
})
