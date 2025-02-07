import { expect } from 'chai'
import { describe, it } from 'mocha'
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'
import { GcpTransformer } from '../dist/index.js'

import {
  gcps3,
  generalGcps3Identity,
  generalGcps3Polynomial,
  gcps6,
  gcps10
} from './input/gcps-test.js'

describe('Helmert transformation', async () => {
  const transformer = new GcpTransformer(generalGcps3Identity, 'helmert')
  const input = [1, 1]
  const output = [1, 1]

  it(`should do an identity transform if input and output coordinates are the same`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Helmert transformation with different handeness', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert', {
    differentHandedness: true
  })
  const input = [100, 100]
  // from custom test using https://github.com/mclaeysb/distortionAnalysis/blob/master/functions/helmert.m
  const output = [4.925027120153211, 52.46506809004473]

  it(`should have the same output as distortionAnalysis Helmert, and respect different handedness`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Helmert transformation with different handeness only specified in transformation', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert')
  const input = [100, 100]
  const output = [4.925027120153211, 52.46506809004473]

  it(`should have the wrong output since handedness should be specified when building transformer`, () => {
    expect(
      transformer.transformForward(input, {
        differentHandedness: true
      })[0]
    ).to.not.be.approximately(output[0], 0.00001)
  })
})

describe('Helmert backward transformation with different handeness', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert', {
    differentHandedness: true
  })
  const input = [4.925027120153211, 52.46506809004473]
  const output = [146.25183291709982, 122.59989116975339]

  it(`should have the correct output, and respect different handedness`, () => {
    expectToBeCloseToArray(transformer.transformBackward(input), output)
  })
})

describe('Helmert backward transformation with different handeness and flipped y axis', async () => {
  const transformer = new GcpTransformer(gcps3, 'helmert', {
    differentHandedness: true
  })
  const input = [4.925027120153211, 52.46506809004473]
  const output = [146.25183291709982, -122.59989116975339]

  it(`should have the correct output with flipped y axis, and respect different handedness`, () => {
    expectToBeCloseToArray(
      transformer.transformBackward(input, {}, (generalGcp) => [
        generalGcp.source[0],
        -generalGcp.source[1]
      ]),
      output
    )
  })
})

describe('Polynomial transformation', async () => {
  const transformer = new GcpTransformer(generalGcps3Polynomial, 'polynomial')
  const input = [1, 1]
  const output = [6, 14]

  it(`should do a polynomial transform`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Polynomial Backward transformation', async () => {
  const transformer = new GcpTransformer(generalGcps3Polynomial, 'polynomial')
  const input = [6, 14]
  const output = [1, 1]

  it(`should do a roundtrip backward polynomial transform since there are exactly three GCPs`, () => {
    expectToBeCloseToArray(transformer.transformBackward(input), output)
  })
})

describe('Polynomial transformation, order 1', async () => {
  const transformer = new GcpTransformer(gcps3, 'polynomial')
  const input = [100, 100]
  // from: gdaltransform -output_xy -gcp 518 991 4.9516614 52.4633102 -gcp 4345 2357 5.0480391 52.5123762 -gcp 2647 475 4.9702906 52.5035815
  // with input: 100 100
  const output = [4.92079391286352, 52.4654946986157]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Polynomial transformation, order 2', async () => {
  const transformer = new GcpTransformer(gcps6, 'polynomial2')
  const input = [1000, 1000]
  // from: gdaltransform -output_xy -order 2 -gcp 1344 4098 4.4091165 51.9017125 -gcp 4440 3441 4.5029222 51.9164451 -gcp 3549 4403 4.4764224 51.897309 -gcp 1794 2130 4.4199066 51.9391509 -gcp 3656 2558 4.4775683 51.9324358 -gcp 2656 3558 4.4572643 51.9143043
  // with input: 1000 1000
  const output = [4.36596042386853, 51.9550430503008]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Polynomial transformation, order 3', async () => {
  const transformer = new GcpTransformer(gcps10, 'polynomial3')
  const input = [10000, 10000]
  // from: gdaltransform -output_xy -order 3 -gcp 6933 3641 -5.6931398 56.1290282 -gcp 6158 1470 -6.2921755 58.5220974 -gcp 9142 2240 -2.1077545 57.687078 -gcp 9626 9058 -1.5642528 50.6648133 -gcp 8387 1447 -3.0589806 58.6152482 -gcp 11709 8644 1.5829224 50.8667829 -gcp 8995 5647 -2.8041724 54.0553335 -gcp 12903 6620 4.7685316 52.9630668 -gcp 8262 9534 -3.6827528 50.2116403 -gcp 6925 9356 -5.7572694 50.055299
  // with input: 10000 10000
  const output = [-1.34357085609956, 49.7913344676161]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Projective transformation', async () => {
  const transformer = new GcpTransformer(gcps6, 'projective')
  const input = [1000, 1000]
  const output = [4.3996721825549265, 51.957630080558445] // TODO: Check this in a reference implementation

  it(`should have the same output as (TODO: check reference)`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Thin plate spline transformation', async () => {
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const input = [1000, 1000]
  // from: gdaltransform -output_xy -tps -gcp 1344 4098 4.4091165 51.9017125 -gcp 4440 3441 4.5029222 51.9164451 -gcp 3549 4403 4.4764224 51.897309 -gcp 1794 2130 4.4199066 51.9391509 -gcp 3656 2558 4.4775683 51.9324358 -gcp 2656 3558 4.4572643 51.9143043
  // with input: 1000 1000
  const output = [4.38895777703007, 51.9590841915719]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.transformForward(input), output)
  })
})

describe('Thin plate spline transformation distortion', async () => {
  const helmertTransformer = new GcpTransformer(gcps6, 'helmert')
  const forwardHelmertTransformation =
    helmertTransformer.getForwardTransformation()
  const referenceScale = forwardHelmertTransformation.scale

  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const input = [1000, 1000]
  const output = 1.7800137112938559

  it(`should be able to compute distortion`, () => {
    expect(
      transformer.transformForward(
        input,
        {
          distortionMeasures: ['log2sigma'],
          referenceScale
        },
        (generalGcp) => generalGcp.distortions.get('log2sigma')
      )
    ).to.equal(output)
  })
})
