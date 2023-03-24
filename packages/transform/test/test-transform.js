import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Transformer } from '../dist/index.js'

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
    world: [4.4091165, 51.9017125],
    image: [1344, 4098]
  },
  {
    world: [4.5029222, 51.9164451],
    image: [4440, 3441]
  },
  {
    world: [4.4764224, 51.897309],
    image: [3549, 4403]
  },
  {
    world: [4.4199066, 51.9391509],
    image: [1794, 2130]
  },
  {
    world: [4.4775683, 51.9324358],
    image: [3656, 2558]
  }
]

function expectToBeCloseToArray(actual, expected) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n, i) => expect(n).to.be.approximately(expected[i], 0.00001))
}

describe('Polynomial transformer', async () => {
  const transformer = new Transformer(gcps)

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(
      transformer.toWorld([100, 100]),
      [4.92079391286352, 52.4654946986157]
    )
    expectToBeCloseToArray(
      transformer.toWorld([1000, 1000]),
      [4.95932911267323, 52.4711479887873]
    )
  })
})

describe('Thin-plate spline transformer', async () => {
  const transformer = new Transformer(gcps2, 'thin-plate-spline')

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    console.log(transformer.toWorld([518, 991]))
    console.log(transformer.toWorld([1000, 1000]))

    expectToBeCloseToArray(
      transformer.toWorld([100, 100]),
      [4.92079391286352, 52.4654946986157]
    )
    expectToBeCloseToArray(
      transformer.toWorld([1000, 1000]),
      [4.95932911267323, 52.4711479887873]
    )
  })
})
