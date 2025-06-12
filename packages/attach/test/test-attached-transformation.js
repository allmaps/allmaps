import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  expectToBeCloseToArrayArray,
  expectToBeCloseToArray
} from '../../stdlib/test/helper-functions.js'
import { rcps0, rcps0Extra, rcps1, rcps2, rcps11, rcps } from './input/rcps.js'

import { AttachedTransformation } from '../dist/AttachedTransformation.js'

// import { generateAnnotation } from '@allmaps/annotation'

export const inputDir = './test/input'

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

describe('Create attachments from RCPs', () => {
  it(`should throw when less then two maps`, () => {
    expect(() =>
      AttachedTransformation.fromGeoreferencedMaps([georeferencedMap0], rcps)
    ).to.throw()
  })

  it(`should throw when there are no RCPs corresponding to any map`, () => {
    expect(() =>
      AttachedTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        [...rcps2]
      )
    ).to.throw()
  })

  it(`should throw when there are no RCPs that occure at least two times`, () => {
    expect(() =>
      AttachedTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        [...rcps0]
      )
    ).to.throw()
  })

  it(`should create a stape when two RCPs with the same id`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1],
      [...rcps0, ...rcps1]
    )

    expect(attachedtransformation.attachments.length).to.equal(1)
  })

  it(`should create multiple stapes when more then two RCPs with the same id`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1, georeferencedMap2],
      [...rcps0, ...rcps1, ...rcps2]
    )

    expect(attachedtransformation.attachments.length).to.equal(4)
  })
})

describe('Coefs matrix for two maps', () => {
  it(`should build the correct destination points arrays`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1],
      rcps11,
      { transformationType: 'polynomial' }
    )

    const resultDestinationPointsArrays = [
      [
        549983.8183030015, 551701.3778583999, 550703.9552208921,
        549978.1298770219, 548498.1706427726, 550155.4284300082, 0
      ],
      [
        6865114.585151263, 6864958.450720401, 6864005.396387596,
        6863216.971363358, 6861901.91679246, 6861373.64125519, 0
      ]
    ]

    expectToBeCloseToArrayArray(
      attachedtransformation.destinationPointsArrays,
      resultDestinationPointsArrays
    )

    const resultCoefsArrayMatrix = [
      [1, 4346, -2550, 0, 0, 0],
      [1, 2243, -1837, 0, 0, 0],
      [1, 3823, -1010, 0, 0, 0],
      [0, 0, 0, 1, 560, -3581],
      [0, 0, 0, 1, 2803, -2460],
      [0, 0, 0, 1, 1009, -1245],
      [1, 4779, -261, -1, -414, 3597]
    ]

    expectToBeCloseToArrayArray(
      attachedtransformation.coefsArrayMatrix,
      resultCoefsArrayMatrix
    )
  })
})

describe('Process transformation type', () => {
  it(`should create create a different coefs matrix depending on the transformation type`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1],
      rcps11,
      { transformationType: 'thinPlateSpline' }
    )
    const polynomialAttachedTransformation =
      AttachedTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        rcps11,
        { transformationType: 'polynomial' }
      )

    const resultThinPlateSplineCoefsArrayMatrix = [
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
        42078047.68792894, 71335080.31185733, 10475095.37333356, 1, 4779, -261,
        -107635.12760934648, -55165726.738789655, -45875151.77560169, -1, -414,
        3597
      ]
    ]
    const polynomialResult = [
      [1, 4346, -2550, 0, 0, 0],
      [1, 2243, -1837, 0, 0, 0],
      [1, 3823, -1010, 0, 0, 0],
      [0, 0, 0, 1, 560, -3581],
      [0, 0, 0, 1, 2803, -2460],
      [0, 0, 0, 1, 1009, -1245],
      [1, 4779, -261, -1, -414, 3597]
    ]

    expectToBeCloseToArrayArray(
      attachedtransformation.coefsArrayMatrix,
      resultThinPlateSplineCoefsArrayMatrix
    )
    expectToBeCloseToArrayArray(
      polynomialAttachedTransformation.coefsArrayMatrix,
      polynomialResult
    )
  })
})

describe('Coefs matrix for more then two maps', () => {
  it(`should build the right coefs matrix`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1, georeferencedMap2],
      rcps11,
      { transformationType: 'polynomial' }
    )

    const resultCoefsArrayMatrix = [
      [1, 4346, -2550, 0, 0, 0, 0, 0, 0],
      [1, 2243, -1837, 0, 0, 0, 0, 0, 0],
      [1, 3823, -1010, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 560, -3581, 0, 0, 0],
      [0, 0, 0, 1, 2803, -2460, 0, 0, 0],
      [0, 0, 0, 1, 1009, -1245, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 3324, -3373],
      [0, 0, 0, 0, 0, 0, 1, 3794, -1538],
      [0, 0, 0, 0, 0, 0, 1, 4463, -2750],
      [1, 4779, -261, -1, -414, 3597, 0, 0, 0],
      [1, 4779, -261, 0, 0, 0, -1, -4780, 3608]
    ]

    expectToBeCloseToArrayArray(
      attachedtransformation.coefsArrayMatrix,
      resultCoefsArrayMatrix
    )
  })
})

describe('Solve two maps attached together and evaluate points', () => {
  it(`should return maps with extra gcps`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [
        georeferencedMap0,
        georeferencedMap1,
        georeferencedMap2,
        georeferencedMap3
      ],
      rcps11,
      {
        transformationType: 'polynomial'
      }
    )
    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()
    // console.log(
    //   JSON.stringify(generateAnnotation(resultingGeoreferencedMaps)),
    //   `https://viewer.allmaps.org/?data=${encodeURIComponent(JSON.stringify(generateAnnotation(resultingGeoreferencedMaps[0])))}`
    // )
    // console.log(
    //   resultingGeoreferencedMaps.map((georeferencedMap) => georeferencedMap.gcps).flat(1)
    // )
    expect(resultingGeoreferencedMaps[0].gcps.length).to.equal(4)
    expect(resultingGeoreferencedMaps[1].gcps.length).to.equal(4)
    expect(resultingGeoreferencedMaps[2].gcps.length).to.equal(4)
    expect(resultingGeoreferencedMaps[3].gcps.length).to.equal(4)
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[0].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[1].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[2].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[3].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
  })
  it(`should have an option to not average out attachments`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [
        georeferencedMap0,
        georeferencedMap1,
        georeferencedMap2,
        georeferencedMap3
      ],
      rcps11,
      {
        transformationType: 'polynomial',
        averageOut: false
      }
    )
    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()
    expect(resultingGeoreferencedMaps[0].gcps.length).to.equal(4)
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[0].gcps[3].geo,
      [4.941802674315016, 52.34761267868184]
    )
  })
  it(`should have an option to evaluate source points`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [
        georeferencedMap0,
        georeferencedMap1,
        georeferencedMap2,
        georeferencedMap3
      ],
      [...rcps11, ...rcps0Extra],
      {
        transformationType: 'polynomial',
        evaluateSingleScps: true
      }
    )
    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()
    expect(resultingGeoreferencedMaps[0].gcps.length).to.equal(5)
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[0].gcps[4].geo,
      [4.947168483334695, 52.348177872139445]
    )
  })
  it(`should have an option to re-evaluate gcps`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [
        georeferencedMap0,
        georeferencedMap1,
        georeferencedMap2,
        georeferencedMap3
      ],
      rcps11,
      {
        transformationType: 'polynomial',
        evaluateGcps: true
      }
    )
    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()
    expect(resultingGeoreferencedMaps[0].gcps.length).to.equal(4)
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[0].gcps[0].geo,
      [4.940600532043473, 52.35798815901273]
    )
  })
  it(`should have an option to remove existing gcps`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [
        georeferencedMap0,
        georeferencedMap1,
        georeferencedMap2,
        georeferencedMap3
      ],
      rcps11,
      {
        transformationType: 'polynomial',
        removeExistingGcps: true
      }
    )
    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()
    expect(resultingGeoreferencedMaps[0].gcps.length).to.equal(1)
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[0].gcps[0].geo,
      [4.941781094220815, 52.34760910486503]
    )
  })
  it(`should have an option to evaluate attachment source control points`, () => {
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [
        georeferencedMap0,
        georeferencedMap1,
        georeferencedMap2,
        georeferencedMap3
      ],
      rcps11,
      {
        transformationType: 'polynomial',
        evaluateAttachmentScps: false
      }
    )
    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()
    expect(resultingGeoreferencedMaps[0].gcps.length).to.equal(3)
    expectToBeCloseToArray(
      resultingGeoreferencedMaps[0].gcps[0].geo,
      [4.9405887, 52.3579862]
    )
  })
})

describe('Compare to observable', () => {
  it(`should return the same`, () => {
    const gridSize = 200

    georeferencedMap0.gcps = [
      {
        resource: [gridSize * 0.2, gridSize * 0.1],
        geo: [gridSize * 0.1, gridSize * 0.1]
      },
      {
        resource: [gridSize * 0.8, gridSize * 0.1],
        geo: [gridSize * 0.4, gridSize * 0.1]
      },
      {
        resource: [gridSize * 0.8, gridSize * 0.7],
        geo: [gridSize * 0.4, gridSize * 0.4]
      },
      {
        resource: [gridSize * 0.2, gridSize * 0.7],
        geo: [gridSize * 0.1, gridSize * 0.4]
      }
    ]
    georeferencedMap1.gcps = [
      {
        resource: [gridSize * 0.2, gridSize * 0.3],
        geo: [gridSize * 0.1, gridSize * 0.6]
      },
      {
        resource: [gridSize * 0.8, gridSize * 0.3],
        geo: [gridSize * 0.4, gridSize * 0.6]
      },
      {
        resource: [gridSize * 0.8, gridSize * 0.9],
        geo: [gridSize * 0.4, gridSize * 0.9]
      },
      {
        resource: [gridSize * 0.2, gridSize * 0.9],
        geo: [gridSize * 0.1, gridSize * 0.9]
      }
    ]
    const rcps = [
      {
        type: 'rcp',
        id: '0',
        mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
        resource: [gridSize * 0.5, gridSize * 0.9]
      },
      {
        type: 'rcp',
        id: '0',
        mapId: 'https://annotations.allmaps.org/maps/3b72f58c723da9c4',
        resource: [gridSize * 0.5, gridSize * 0.1]
      }
    ]
    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1],
      rcps,
      {
        type: 'thinPlateSpline',
        differentHandedness: false,
        internalProjection: {
          definition: 'EPSG:4326'
        },
        projection: {
          definition: 'EPSG:4326'
        }
      }
    )
    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()

    expect(resultingGeoreferencedMaps[0].gcps.length).to.equal(5)
    expect(resultingGeoreferencedMaps[1].gcps.length).to.equal(5)

    // console.log(new Matrix(attachedtransformation.destinationPointsArrays))
    // console.log(new Matrix(attachedtransformation.coefsArrayMatrix))
    // console.log(new Matrix(attachedtransformation.weightsArrays))
    // console.log(resultingGeoreferencedMaps[0].gcps, resultingGeoreferencedMaps[1].gcps)

    expectToBeCloseToArray(resultingGeoreferencedMaps[0].gcps[4].geo, [50, 100])
    expectToBeCloseToArray(resultingGeoreferencedMaps[1].gcps[4].geo, [50, 100])
  })
})
