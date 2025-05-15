import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import eventually from 'chai-as-promised'

import { expectToBeCloseToArrayArray } from '../../stdlib/test/helper-functions.js'

import { StapledTransformation } from '../dist/StapledTransformation.js'

// import { Matrix } from '../../transform/node_modules/ml-matrix/matrix.js'

export const inputDir = './test/input'

chai.use(eventually)

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}

const georeferencedMap0 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-0.json')
)

const georeferencedMap1 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-1.json')
)

const georeferencedMap2 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-2.json')
)

const georeferencedMap3 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-3.json')
)

describe('Filter out the correct staples', () => {
  it(`should not find any staples in the maps by default`, async () => {
    const stapledtransformation =
      await StapledTransformation.fromGeoreferencedMaps([
        georeferencedMap0,
        georeferencedMap1
      ])

    expect(stapledtransformation.staples.length).to.equal(0)
  })
})

describe('Stop on staples that occure only once', () => {
  it(`should not consider staples that occure only once`, async () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
    const stapledtransformation =
      await StapledTransformation.fromGeoreferencedMaps([
        georeferencedMap0,
        georeferencedMap1
      ])

    expect(stapledtransformation.staples.length).to.equal(0)
  })
})

describe('Stop when more then two staple by staple ID', () => {
  it(`should throw when more then two staples by staple ID`, async () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
    georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]
    georeferencedMap2.rcps = [{ id: '1', resource: [5, 6] }]

    return expect(
      Promise.resolve(
        StapledTransformation.fromGeoreferencedMaps([
          georeferencedMap0,
          georeferencedMap1,
          georeferencedMap2
        ])
      )
    ).to.eventually.be.rejected
  })
})

describe('Filter out the correct staples', () => {
  it(`should recognise staples with the same id`, async () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
    georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]
    const stapledtransformation =
      await StapledTransformation.fromGeoreferencedMaps([
        georeferencedMap0,
        georeferencedMap1
      ])

    expect(stapledtransformation.staples.length).to.equal(1)
  })
})

describe('Coefs matrix for two maps', () => {
  it(`should build the correct coefs matrix`, async () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
    georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]
    const stapledtransformation =
      await StapledTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        { type: 'polynomial' }
      )

    const coefsArrayMatrix = stapledtransformation.getCoefsArrayMatrix()

    const result = [
      [1, 4346, -2550, 0, 0, 0],
      [1, 2243, -1837, 0, 0, 0],
      [1, 3823, -1010, 0, 0, 0],
      [0, 0, 0, 1, 560, -3581],
      [0, 0, 0, 1, 2803, -2460],
      [0, 0, 0, 1, 1009, -1245],
      [1, 1, 2, -1, -3, -4]
    ]

    expectToBeCloseToArrayArray(coefsArrayMatrix, result)
  })
})

describe('Process transformation type', () => {
  it(`should create create a different coefs matrix depending on the transformation type`, async () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
    georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]

    const stapledtransformation =
      await StapledTransformation.fromGeoreferencedMaps([
        georeferencedMap0,
        georeferencedMap1
      ])
    const polynomialStapledTransformation =
      await StapledTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        { type: 'polynomial' }
      )

    const coefsArrayMatrix = stapledtransformation.getCoefsArrayMatrix()
    const polynomialCoefsArrayMatrix =
      polynomialStapledTransformation.getCoefsArrayMatrix()

    const result = [
      [
        0, 37995769.084864564, 19558388.536068127, 1, 4346, -2550, 0, 0, 0, 0,
        0, 0
      ],
      [
        37995769.084864564, 0, 23808730.357015487, 1, 2243, -1837, 0, 0, 0, 0,
        0, 0
      ],
      [
        19558388.536068127, 23808730.357015487, 0, 1, 3823, -1010, 0, 0, 0, 0,
        0, 0
      ],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [4346, 2243, 3823, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [-2550, -1837, -1010, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [
        0, 0, 0, 0, 0, 0, 0, 49214077.569569476, 43991048.06955667, 1, 560,
        -3581
      ],
      [
        0, 0, 0, 0, 0, 0, 49214077.569569476, 0, 36059541.99994082, 1, 2803,
        -2460
      ],
      [
        0, 0, 0, 0, 0, 0, 43991048.06955667, 36059541.99994082, 0, 1, 1009,
        -1245
      ],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 560, 2803, 1009, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, -3581, -2460, -1245, 0, 0, 0],
      [
        216463652.42053, 67035603.47656503, 129469205.81095386, 1, 1, 2,
        -107885431.42067781, -114407971.02293757, -18981901.51626959, -1, -3, -4
      ]
    ]
    const polynomialResult = [
      [1, 4346, -2550, 0, 0, 0],
      [1, 2243, -1837, 0, 0, 0],
      [1, 3823, -1010, 0, 0, 0],
      [0, 0, 0, 1, 560, -3581],
      [0, 0, 0, 1, 2803, -2460],
      [0, 0, 0, 1, 1009, -1245],
      [1, 1, 2, -1, -3, -4]
    ]

    expectToBeCloseToArrayArray(coefsArrayMatrix, result)
    expectToBeCloseToArrayArray(polynomialCoefsArrayMatrix, polynomialResult)
  })
})

describe('Coefs matrix for more then two maps', () => {
  it(`should build the right coefs matrix`, async () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
    georeferencedMap1.rcps = [
      { id: '1', resource: [3, 4] },
      { id: '2', resource: [5, 6] }
    ]
    georeferencedMap2.rcps = [{ id: '2', resource: [7, 8] }]

    const stapledtransformation =
      await StapledTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1, georeferencedMap2],
        { type: 'polynomial' }
      )

    const coefsArrayMatrix = stapledtransformation.getCoefsArrayMatrix()

    const result = [
      [1, 4346, -2550, 0, 0, 0, 0, 0, 0],
      [1, 2243, -1837, 0, 0, 0, 0, 0, 0],
      [1, 3823, -1010, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 560, -3581, 0, 0, 0],
      [0, 0, 0, 1, 2803, -2460, 0, 0, 0],
      [0, 0, 0, 1, 1009, -1245, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 3324, -3373],
      [0, 0, 0, 0, 0, 0, 1, 3794, -1538],
      [0, 0, 0, 0, 0, 0, 1, 4463, -2750],
      [1, 1, 2, -1, -3, -4, 0, 0, 0],
      [0, 0, 0, 1, 5, 6, -1, -7, -8]
    ]

    expectToBeCloseToArrayArray(coefsArrayMatrix, result)
  })
})
