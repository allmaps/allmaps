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
  }
]

function expectToBeCloseToArray(actual, expected) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n, i) => expect(n).to.be.approximately(expected[i], 0.00001))
}

describe('Polynomial transformer', async () => {
  const transformer = new GCPTransformer(gcps, 'polynomial')

  console.log(
    'With ',
    gcps.length,
    ' controle points and a first order polynomial (affine) transformation our output for point [100, 100] is ',
    transformer.toWorld([100, 100]),
    ' and should be close to GDALs output ',
    [4.92079391286352, 52.4654946986157]
  )

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    // from: gdaltransform -output_xy -gcp 518 991 4.9516614 52.4633102 -gcp 4345 2357 5.0480391 52.5123762 -gcp 2647 475 4.9702906 52.5035815
    // with input e.g.: 100 100
    expectToBeCloseToArray(
      transformer.toWorld([100, 100]),
      [4.92079391286352, 52.4654946986157]
    )
  })
})

describe('Thin-plate spline transformer', async () => {
  const transformer = new GCPTransformer(gcps2, 'thin-plate-spline')

  console.log(
    'With ',
    gcps2.length,
    ' controle points and a TPS transformation our output for point [1000, 1000] is ',
    transformer.toWorld([1000, 1000]),
    ' and should be close to GDALs output ',
    [4.39415154224292, 51.9599873720927]
  )

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    // from: gdaltransform -output_xy -tps -gcp 1344 4098 4.4091165 51.9017125 -gcp 4440 3441 4.5029222 51.9164451 -gcp 3549 4403 4.4764224 51.897309 -gcp 1794 2130 4.4199066 51.9391509 -gcp 3656 2558 4.4775683 51.9324358
    // with input e.g.: 1000 1000
    expectToBeCloseToArray(
      transformer.toWorld([1000, 1000]),
      [4.39415154224292, 51.9599873720927]
    )
  })
})
