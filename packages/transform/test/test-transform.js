import { describe, it } from 'mocha'
import { expect } from 'chai'

import { GCPTransformer } from '../dist/index.js'

const gcps = [
  {
    image: [518, 991],
    world: [4.9516614, 52.4633102]
  },
  {
    image: [4345, 2357],
    world: [5.0480391, 52.5123762]
  },
  {
    image: [2647, 475],
    world: [4.9702906, 52.5035815]
  }
]

const gcps2 = [
  {
    image: [1344, 4098],
    world: [4.4091165, 51.9017125]
  },
  {
    image: [4440, 3441],
    world: [4.5029222, 51.9164451]
  },
  {
    image: [3549, 4403],
    world: [4.4764224, 51.897309]
  },
  {
    image: [1794, 2130],
    world: [4.4199066, 51.9391509]
  },
  {
    image: [3656, 2558],
    world: [4.4775683, 51.9324358]
  },
  {
    image: [2656, 3558],
    world: [4.4572643, 51.9143043]
  }
]

const gcps3 = [
  { image: [6933, 3641], world: [-5.6931398, 56.1290282] },
  {
    image: [6158, 1470],
    world: [-6.2921755, 58.5220974]
  },
  {
    image: [9142, 2240],
    world: [-2.1077545, 57.687078]
  },
  {
    image: [9626, 9058],
    world: [-1.5642528, 50.6648133]
  },
  {
    image: [8387, 1447],
    world: [-3.0589806, 58.6152482]
  },
  {
    image: [11709, 8644],
    world: [1.5829224, 50.8667829]
  },
  {
    image: [8995, 5647],
    world: [-2.8041724, 54.0553335]
  },
  {
    image: [12903, 6620],
    world: [4.7685316, 52.9630668]
  },
  {
    image: [8262, 9534],
    world: [-3.6827528, 50.2116403]
  },
  {
    image: [6925, 9356],
    world: [-5.7572694, 50.055299]
  }
]

function expectToBeCloseToArray(actual, expected) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n, i) => expect(n).to.be.approximately(expected[i], 0.00001))
}

describe('Helmert transformer', async () => {
  const transformer = new GCPTransformer(gcps, 'helmert')
  const input = [100, 100]
  // from custom test using https://github.com/mclaeysb/distortionAnalysis/blob/master/functions/helmert.m
  const output = [4.9385700843392435, 52.46580484503631]

  it(`should have the same output as distortionAnalysis Helmert`, () => {
    expectToBeCloseToArray(transformer.toWorld(input), output)
  })

  // console.log(
  //   'With ',
  //   gcps.length,
  //   ' controle points and a Helmert transformation our output for point [100, 100] is ',
  //   transformer.toWorld(input),
  //   ' and should be close to distortionAnalysis Helmert output ',
  //   output
  // )
})

describe('Polynomial transformer, order 1', async () => {
  const transformer = new GCPTransformer(gcps, 'polynomial')
  const input = [100, 100]
  // from: gdaltransform -output_xy -gcp 518 991 4.9516614 52.4633102 -gcp 4345 2357 5.0480391 52.5123762 -gcp 2647 475 4.9702906 52.5035815
  // with input: 100 100
  const output = [4.92079391286352, 52.4654946986157]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.toWorld(input), output)
  })

  // console.log(
  //   'With ',
  //   gcps.length,
  //   ' controle points and a first order polynomial (affine) transformation our output for point [100, 100] is ',
  //   transformer.toWorld(input),
  //   ' and should be close to GDALs output ',
  //   output
  // )
})

describe('Polynomial transformer, order 2', async () => {
  const transformer = new GCPTransformer(gcps2, 'polynomial2')
  const input = [1000, 1000]
  // from: gdaltransform -output_xy -order 2 -gcp 1344 4098 4.4091165 51.9017125 -gcp 4440 3441 4.5029222 51.9164451 -gcp 3549 4403 4.4764224 51.897309 -gcp 1794 2130 4.4199066 51.9391509 -gcp 3656 2558 4.4775683 51.9324358 -gcp 2656 3558 4.4572643 51.9143043
  // with input: 1000 1000
  const output = [4.36596042386853, 51.9550430503008]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.toWorld(input), output)
  })

  // console.log(
  //   'With ',
  //   gcps.length,
  //   ' controle points and a second order polynomial transformation our output for point [100, 100] is ',
  //   transformer.toWorld(input),
  //   ' and should be close to GDALs output ',
  //   output
  // )
})

describe('Polynomial transformer, order 3', async () => {
  const transformer = new GCPTransformer(gcps3, 'polynomial3')
  const input = [10000, 10000]
  // from: gdaltransform -output_xy -order 3 -gcp 6933 3641 -5.6931398 56.1290282 -gcp 6158 1470 -6.2921755 58.5220974 -gcp 9142 2240 -2.1077545 57.687078 -gcp 9626 9058 -1.5642528 50.6648133 -gcp 8387 1447 -3.0589806 58.6152482 -gcp 11709 8644 1.5829224 50.8667829 -gcp 8995 5647 -2.8041724 54.0553335 -gcp 12903 6620 4.7685316 52.9630668 -gcp 8262 9534 -3.6827528 50.2116403 -gcp 6925 9356 -5.7572694 50.055299
  // with input: 10000 10000
  const output = [-1.34357085609956, 49.7913344676161]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.toWorld(input), output)
  })

  // console.log(
  //   'With ',
  //   gcps.length,
  //   ' controle points and a second order polynomial transformation our output for point [100, 100] is ',
  //   transformer.toWorld(input),
  //   ' and should be close to GDALs output ',
  //   output
  // )
})

describe('Thin-plate spline transformer', async () => {
  const transformer = new GCPTransformer(gcps2, 'thin-plate-spline')
  const input = [1000, 1000]
  // from: gdaltransform -output_xy -tps -gcp 1344 4098 4.4091165 51.9017125 -gcp 4440 3441 4.5029222 51.9164451 -gcp 3549 4403 4.4764224 51.897309 -gcp 1794 2130 4.4199066 51.9391509 -gcp 3656 2558 4.4775683 51.9324358 -gcp 2656 3558 4.4572643 51.9143043
  // with input: 1000 1000
  const output = [4.38895777703007, 51.9590841915719]

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(transformer.toWorld(input), output)
  })

  // console.log(
  //   'With ',
  //   gcps2.length,
  //   ' controle points and a TPS transformation our output for point [1000, 1000] is ',
  //   transformer.toWorld(input),
  //   ' and should be close to GDALs output ',
  //   output
  // )
})
