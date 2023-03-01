import { describe, it } from 'mocha'
import { expect } from 'chai'

import { createTransformer, toWorld } from '../dist/index.js'

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

function expectToBeCloseToArray(actual, expected) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n, i) => expect(n).to.be.approximately(expected[i], 0.00001))
}

describe('toImage', async () => {
  const transformArgs = createTransformer(gcps)

  it(`should have the same output as running GDAL's gdaltransform`, () => {
    expectToBeCloseToArray(
      toWorld(transformArgs, [100, 100]),
      [4.92079391286352, 52.4654946986157]
    )
    expectToBeCloseToArray(
      toWorld(transformArgs, [1000, 1000]),
      [4.95932911267323, 52.4711479887873]
    )
  })
})
