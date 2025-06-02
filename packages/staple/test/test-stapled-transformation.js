import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  expectToBeCloseToArrayArray,
  expectToBeCloseToArray
} from '../../stdlib/test/helper-functions.js'

import { StapledTransformation } from '../dist/StapledTransformation.js'

import { generateAnnotation } from '../../annotation/dist/index.js'

export const inputDir = './test/input'

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}

const georeferencedMap0 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-0.json')
)
const rcps0 = [
  {
    type: 'rcp',
    id: 'center',
    mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    resource: [4779, 261]
  }
]
const rcps0Extra = [
  {
    type: 'rcp',
    id: 'extra',
    mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    resource: [4000, 200]
  }
]

const georeferencedMap1 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-1.json')
)
const rcps1 = [
  {
    type: 'rcp',
    id: 'center',
    mapId: 'https://annotations.allmaps.org/maps/3b72f58c723da9c4',
    resource: [414, 3597]
  }
]

const georeferencedMap2 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-2.json')
)
const rcps2 = [
  {
    type: 'rcp',
    id: 'center',
    mapId: 'https://annotations.allmaps.org/maps/bb4029969eeff948',
    resource: [4780, 3608]
  }
]

const georeferencedMap3 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-3.json')
)
const rcps3 = [
  {
    type: 'rcp',
    id: 'center',
    mapId: 'https://annotations.allmaps.org/maps/5cf13f6681d355e3',
    resource: [465, 257]
  }
]

describe('Create staples from RCPs', () => {
  it(`should throw when there are no RCPs corresponding to any map`, () => {
    expect(() =>
      StapledTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        [...rcps2]
      )
    ).to.throw()
  })

  it(`should throw when there are no RCPs that occure at least two times`, () => {
    expect(() =>
      StapledTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        [...rcps0]
      )
    ).to.throw()
  })

  it(`should create a stape when two RCPs with the same id`, () => {
    const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1],
      [...rcps0, ...rcps1]
    )

    expect(stapledtransformation.staples.length).to.equal(1)
  })

  it(`should create multiple stapes when more then two RCPs with the same id`, () => {
    const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1, georeferencedMap2],
      [...rcps0, ...rcps1, ...rcps2]
    )

    expect(stapledtransformation.staples.length).to.equal(2)
  })
})

describe('Coefs matrix for two maps', () => {
  it(`should build the correct destination points arrays`, () => {
    const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1],
      [...rcps0, ...rcps1],
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
      stapledtransformation.destinationPointsArrays,
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
      stapledtransformation.coefsArrayMatrix,
      resultCoefsArrayMatrix
    )
  })
})

describe('Process transformation type', () => {
  it(`should create create a different coefs matrix depending on the transformation type`, () => {
    const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1],
      [...rcps0, ...rcps1],
      { transformationType: 'thinPlateSpline' }
    )
    const polynomialStapledTransformation =
      StapledTransformation.fromGeoreferencedMaps(
        [georeferencedMap0, georeferencedMap1],
        [...rcps0, ...rcps1],
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
      stapledtransformation.coefsArrayMatrix,
      resultThinPlateSplineCoefsArrayMatrix
    )
    expectToBeCloseToArrayArray(
      polynomialStapledTransformation.coefsArrayMatrix,
      polynomialResult
    )
  })
})

describe('Coefs matrix for more then two maps', () => {
  it(`should build the right coefs matrix`, () => {
    const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
      [georeferencedMap0, georeferencedMap1, georeferencedMap2],
      [...rcps0, ...rcps1, ...rcps2],
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
      stapledtransformation.coefsArrayMatrix,
      resultCoefsArrayMatrix
    )
  })
})

describe('Solve two maps stapled together and evaluate points', () => {
  //   it(`should return maps with extra gcps`, () => {
  //     const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
  //       [
  //         georeferencedMap0,
  //         georeferencedMap1,
  //         georeferencedMap2,
  //         georeferencedMap3
  //       ],
  //       [...rcps0, ...rcps1, ...rcps2, ...rcps3],
  //       {
  //         transformationType: 'polynomial'
  //       }
  //     )
  //     const resultinggeoreferencedmaps = stapledtransformation.toGeoreferencedMaps()
  //     // console.log(
  //     //   JSON.stringify(generateAnnotation(resultinggeoreferencedmaps))
  //     //   // `https://viewer.allmaps.org/?data=${encodeURIComponent(JSON.stringify(generateAnnotation(resultinggeoreferencedmaps[0])))}`
  //     // )
  //     // console.log(
  //     //   resultinggeoreferencedmaps.map((georeferencedMap) => georeferencedMap.gcps).flat(1)
  //     // )
  //     expect(resultinggeoreferencedmaps[0].gcps.length).to.equal(4)
  //     expect(resultinggeoreferencedmaps[1].gcps.length).to.equal(4)
  //     expect(resultinggeoreferencedmaps[2].gcps.length).to.equal(4)
  //     expect(resultinggeoreferencedmaps[3].gcps.length).to.equal(4)
  //     expectToBeCloseToArray(
  //       resultinggeoreferencedmaps[0].gcps[3].geo,
  //       [4.941781094220815, 52.34760910486503]
  //     )
  //     expectToBeCloseToArray(
  //       resultinggeoreferencedmaps[1].gcps[3].geo,
  //       [4.941781094220815, 52.34760910486503]
  //     )
  //     expectToBeCloseToArray(
  //       resultinggeoreferencedmaps[2].gcps[3].geo,
  //       [4.941781094220815, 52.34760910486503]
  //     )
  //     expectToBeCloseToArray(
  //       resultinggeoreferencedmaps[3].gcps[3].geo,
  //       [4.941781094220815, 52.34760910486503]
  //     )
  //   })
  // it(`should have an option to not average out staple points`, () => {
  //   const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
  //     [
  //       georeferencedMap0,
  //       georeferencedMap1,
  //       georeferencedMap2,
  //       georeferencedMap3
  //     ],
  //     [...rcps0, ...rcps0Extra, ...rcps1, ...rcps2, ...rcps3],
  //     {
  //       transformationType: 'polynomial',
  //       averageOutStaplePoints: false
  //     }
  //   )
  //   const resultinggeoreferencedmaps = stapledtransformation.toGeoreferencedMaps()
  //   expect(resultinggeoreferencedmaps[0].gcps.length).to.equal(4)
  //   expectToBeCloseToArray(
  //     resultinggeoreferencedmaps[0].gcps[3].geo,
  //     [4.941802674315016, 52.34761267868184]
  //   )
  // })
  // it(`should have an option to evaluate single staplepoints`, () => {
  //   const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
  //     [
  //       georeferencedMap0,
  //       georeferencedMap1,
  //       georeferencedMap2,
  //       georeferencedMap3
  //     ],
  //     [...rcps0, ...rcps0Extra, ...rcps1, ...rcps2, ...rcps3],
  //     {
  //       transformationType: 'polynomial',
  //       evaluateSingleStaplePoints: true
  //     }
  //   )
  //   const resultinggeoreferencedmaps = stapledtransformation.toGeoreferencedMaps()
  //   expect(resultinggeoreferencedmaps[0].gcps.length).to.equal(5)
  //   expectToBeCloseToArray(
  //     resultinggeoreferencedmaps[0].gcps[4].geo,
  //     [4.947168483334695, 52.348177872139445]
  //   )
  // })
  // it(`should have an option to re-evaluate gcps`, () => {
  //   const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
  //     [
  //       georeferencedMap0,
  //       georeferencedMap1,
  //       georeferencedMap2,
  //       georeferencedMap3
  //     ],
  //     [...rcps0, ...rcps1, ...rcps2, ...rcps3],
  //     {
  //       transformationType: 'polynomial',
  //       evaluateGcps: true
  //     }
  //   )
  //   const resultinggeoreferencedmaps = stapledtransformation.toGeoreferencedMaps()
  //   expect(resultinggeoreferencedmaps[0].gcps.length).to.equal(4)
  //   expectToBeCloseToArray(
  //     resultinggeoreferencedmaps[0].gcps[0].geo,
  //     [4.940600532043473, 52.35798815901273]
  //   )
  // })
  // it(`should have an option to remove existing gcps`, () => {
  //   const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
  //     [
  //       georeferencedMap0,
  //       georeferencedMap1,
  //       georeferencedMap2,
  //       georeferencedMap3
  //     ],
  //     [...rcps0, ...rcps1, ...rcps2, ...rcps3],
  //     {
  //       transformationType: 'polynomial',
  //       removeExistingGcps: true
  //     }
  //   )
  //   const resultinggeoreferencedmaps = stapledtransformation.toGeoreferencedMaps()
  //   expect(resultinggeoreferencedmaps[0].gcps.length).to.equal(1)
  //   expectToBeCloseToArray(
  //     resultinggeoreferencedmaps[0].gcps[0].geo,
  //     [4.941781094220815, 52.34760910486503]
  //   )
  // })
  // it(`should have an option to evaluate staplepoints`, () => {
  //   const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
  //     [
  //       georeferencedMap0,
  //       georeferencedMap1,
  //       georeferencedMap2,
  //       georeferencedMap3
  //     ],
  //     [...rcps0, ...rcps1, ...rcps2, ...rcps3],
  //     {
  //       transformationType: 'polynomial',
  //       evaluateStaplePoints: false,
  //       evaluateGcps: true
  //     }
  //   )
  //   const resultinggeoreferencedmaps = stapledtransformation.toGeoreferencedMaps()
  //   expect(resultinggeoreferencedmaps[0].gcps.length).to.equal(3)
  //   expectToBeCloseToArray(
  //     resultinggeoreferencedmaps[0].gcps[0].geo,
  //     [4.940600532043473, 52.35798815901273]
  //   )
  // })
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
    const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
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
    const resultinggeoreferencedmaps =
      stapledtransformation.toGeoreferencedMaps()

    expect(resultinggeoreferencedmaps[0].gcps.length).to.equal(5)
    expect(resultinggeoreferencedmaps[1].gcps.length).to.equal(5)

    // console.log(new Matrix(stapledtransformation.destinationPointsArrays))
    // console.log(new Matrix(stapledtransformation.coefsArrayMatrix))
    // console.log(new Matrix(stapledtransformation.weightsArrays))
    // console.log(resultinggeoreferencedmaps[0].gcps, resultinggeoreferencedmaps[1].gcps)

    expectToBeCloseToArray(resultinggeoreferencedmaps[0].gcps[4].geo, [50, 100])
    expectToBeCloseToArray(resultinggeoreferencedmaps[1].gcps[4].geo, [50, 100])
  })
})
