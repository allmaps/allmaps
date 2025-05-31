import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import eventually from 'chai-as-promised'

import {
  expectToBeCloseToArrayArray,
  expectToBeCloseToArray
} from '../../stdlib/test/helper-functions.js'

import { StapledTransformation } from '../dist/StapledTransformation.js'

import { Matrix } from '../../transform/node_modules/ml-matrix/matrix.js'
import { generateAnnotation } from '../../annotation/dist/index.js'

export const inputDir = './test/input'

chai.use(eventually)

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}

const georeferencedMap0 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-0.json')
)
const rcps0 = [{ id: 'center', resource: [4779, 261] }]

const georeferencedMap1 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-1.json')
)
const rcps1 = [{ id: 'center', resource: [414, 3597] }]

const georeferencedMap2 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-2.json')
)
const rcps2 = [{ id: 'center', resource: [4780, 3608] }]

const georeferencedMap3 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-3.json')
)
const rcps3 = [{ id: 'center', resource: [465, 257] }]

// describe('Filter out the correct staples', () => {
//   it(`should throw when there are not any maps with staples`,  () => {
//     return expect(
//       Promise.resolve(
//         StapledTransformation.fromGeoreferencedMaps([
//           georeferencedMap0,
//           georeferencedMap1
//         ])
//       )
//     ).to.eventually.be.rejected
//   })
// })

// describe('Stop on staples that occure only once', () => {
//   it(`should not consider staples that occure only once`,  () => {
//     georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps([
//         georeferencedMap0,
//         georeferencedMap1
//       ])

//     expect(stapledtransformation.staples.length).to.equal(0)
//   })
// })

// describe('Stop when more then two staple by staple ID', () => {
//   it(`should throw when more then two staples by staple ID`,  () => {
//     georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
//     georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]
//     georeferencedMap2.rcps = [{ id: '1', resource: [5, 6] }]

//     return expect(
//       Promise.resolve(
//         StapledTransformation.fromGeoreferencedMaps([
//           georeferencedMap0,
//           georeferencedMap1,
//           georeferencedMap2
//         ])
//       )
//     ).to.eventually.be.rejected
//   })
// })

// describe('Filter out the correct staples', () => {
//   it(`should recognise staples with the same id`,  () => {
//     georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
//     georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]
//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps([
//         georeferencedMap0,
//         georeferencedMap1
//       ])

//     expect(stapledtransformation.staples.length).to.equal(1)
//   })
// })

// describe('Coefs matrix for two maps', () => {
//   it(`should build the correct destination points arrays`,  () => {
//     georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
//     georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]
//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps(
//         [georeferencedMap0, georeferencedMap1],
//         { type: 'polynomial' }
//       )

//     const destinationPointsArrays =
//       stapledtransformation.destinationPointsArrays

//     const result = [
//       [4.9405887, 4.9560178, 4.9470578, 4.9405376, 4.9272429, 4.9421303, 0],
//       [
//         52.3579862, 52.3571296, 52.3519005, 52.3475742, 52.3403572, 52.3374577,
//         0
//       ]
//     ]

//     expectToBeCloseToArrayArray(destinationPointsArrays, result)
//   })
// })

// describe('Coefs matrix for two maps', () => {
//   it(`should build the correct coefs array matrix`,  () => {
//     georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
//     georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]
//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps(
//         [georeferencedMap0, georeferencedMap1],
//         { type: 'polynomial' }
//       )

//     const coefsArrayMatrix = stapledtransformation.coefsArrayMatrix

//     const result = [
//       [1, 4346, -2550, 0, 0, 0],
//       [1, 2243, -1837, 0, 0, 0],
//       [1, 3823, -1010, 0, 0, 0],
//       [0, 0, 0, 1, 560, -3581],
//       [0, 0, 0, 1, 2803, -2460],
//       [0, 0, 0, 1, 1009, -1245],
//       [1, 1, 2, -1, -3, -4]
//     ]

//     expectToBeCloseToArrayArray(coefsArrayMatrix, result)
//   })
// })

// describe('Process transformation type', () => {
//   it(`should create create a different coefs matrix depending on the transformation type`,  () => {
//     georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
//     georeferencedMap1.rcps = [{ id: '1', resource: [3, 4] }]

//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps([
//         georeferencedMap0,
//         georeferencedMap1
//       ])
//     const polynomialStapledTransformation =
//        StapledTransformation.fromGeoreferencedMaps(
//         [georeferencedMap0, georeferencedMap1],
//         { type: 'polynomial' }
//       )

//     const coefsArrayMatrix = stapledtransformation.coefsArrayMatrix
//     const polynomialCoefsArrayMatrix =
//       polynomialStapledTransformation.coefsArrayMatrix

//     const result = [
//       [
//         0, 37995769.084864564, 19558388.536068127, 1, 4346, -2550, 0, 0, 0, 0,
//         0, 0
//       ],
//       [
//         37995769.084864564, 0, 23808730.357015487, 1, 2243, -1837, 0, 0, 0, 0,
//         0, 0
//       ],
//       [
//         19558388.536068127, 23808730.357015487, 0, 1, 3823, -1010, 0, 0, 0, 0,
//         0, 0
//       ],
//       [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
//       [4346, 2243, 3823, 0, 0, 0, 0, 0, 0, 0, 0, 0],
//       [-2550, -1837, -1010, 0, 0, 0, 0, 0, 0, 0, 0, 0],
//       [
//         0, 0, 0, 0, 0, 0, 0, 49214077.569569476, 43991048.06955667, 1, 560,
//         -3581
//       ],
//       [
//         0, 0, 0, 0, 0, 0, 49214077.569569476, 0, 36059541.99994082, 1, 2803,
//         -2460
//       ],
//       [
//         0, 0, 0, 0, 0, 0, 43991048.06955667, 36059541.99994082, 0, 1, 1009,
//         -1245
//       ],
//       [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
//       [0, 0, 0, 0, 0, 0, 560, 2803, 1009, 0, 0, 0],
//       [0, 0, 0, 0, 0, 0, -3581, -2460, -1245, 0, 0, 0],
//       [
//         216463652.42053, 67035603.47656503, 129469205.81095386, 1, 1, 2,
//         -107885431.42067781, -114407971.02293757, -18981901.51626959, -1, -3, -4
//       ]
//     ]
//     const polynomialResult = [
//       [1, 4346, -2550, 0, 0, 0],
//       [1, 2243, -1837, 0, 0, 0],
//       [1, 3823, -1010, 0, 0, 0],
//       [0, 0, 0, 1, 560, -3581],
//       [0, 0, 0, 1, 2803, -2460],
//       [0, 0, 0, 1, 1009, -1245],
//       [1, 1, 2, -1, -3, -4]
//     ]

//     expectToBeCloseToArrayArray(coefsArrayMatrix, result)
//     expectToBeCloseToArrayArray(polynomialCoefsArrayMatrix, polynomialResult)
//   })
// })

// describe('Coefs matrix for more then two maps', () => {
//   it(`should build the right coefs matrix`,  () => {
//     georeferencedMap0.rcps = [{ id: '1', resource: [1, 2] }]
//     georeferencedMap1.rcps = [
//       { id: '1', resource: [3, 4] },
//       { id: '2', resource: [5, 6] }
//     ]
//     georeferencedMap2.rcps = [{ id: '2', resource: [7, 8] }]

//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps(
//         [georeferencedMap0, georeferencedMap1, georeferencedMap2],
//         { type: 'polynomial' }
//       )

//     const coefsArrayMatrix = stapledtransformation.coefsArrayMatrix

//     const result = [
//       [1, 4346, -2550, 0, 0, 0, 0, 0, 0],
//       [1, 2243, -1837, 0, 0, 0, 0, 0, 0],
//       [1, 3823, -1010, 0, 0, 0, 0, 0, 0],
//       [0, 0, 0, 1, 560, -3581, 0, 0, 0],
//       [0, 0, 0, 1, 2803, -2460, 0, 0, 0],
//       [0, 0, 0, 1, 1009, -1245, 0, 0, 0],
//       [0, 0, 0, 0, 0, 0, 1, 3324, -3373],
//       [0, 0, 0, 0, 0, 0, 1, 3794, -1538],
//       [0, 0, 0, 0, 0, 0, 1, 4463, -2750],
//       [1, 1, 2, -1, -3, -4, 0, 0, 0],
//       [0, 0, 0, 1, 5, 6, -1, -7, -8]
//     ]

//     expectToBeCloseToArrayArray(coefsArrayMatrix, result)
//   })
// })

describe('Solve two maps stapled together and evaluate points', () => {
  it(`should return maps with extra gcps`, () => {
    georeferencedMap0.rcps = rcps0
    georeferencedMap1.rcps = rcps1
    georeferencedMap2.rcps = rcps2
    georeferencedMap3.rcps = rcps3
    const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
      [
        georeferencedMap0,
        georeferencedMap1,
        georeferencedMap2,
        georeferencedMap3
      ],
      {
        transformationType: 'polynomial'
      }
    )
    const results = stapledtransformation.toGeoreferencedMaps()

    // console.log(
    //   JSON.stringify(generateAnnotation(results))
    //   // `https://viewer.allmaps.org/?data=${encodeURIComponent(JSON.stringify(generateAnnotation(results[0])))}`
    // )
    // console.log(
    //   results.map((georeferencedMap) => georeferencedMap.gcps).flat(1)
    // )

    expect(results[0].gcps.length).to.equal(4)
    expect(results[1].gcps.length).to.equal(4)
    expect(results[2].gcps.length).to.equal(4)
    expect(results[3].gcps.length).to.equal(4)

    expectToBeCloseToArray(
      results[0].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
    expectToBeCloseToArray(
      results[1].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
    expectToBeCloseToArray(
      results[2].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
    expectToBeCloseToArray(
      results[3].gcps[3].geo,
      [4.941781094220815, 52.34760910486503]
    )
  })
})

// describe('Compare to observable', () => {
//   it(`should return the same`,  () => {
//     const gridSize = 200

//     georeferencedMap0.gcps = [
//       {
//         resource: [gridSize * 0.2, gridSize * 0.1],
//         geo: [gridSize * 0.1, gridSize * 0.1]
//       },
//       {
//         resource: [gridSize * 0.8, gridSize * 0.1],
//         geo: [gridSize * 0.4, gridSize * 0.1]
//       },
//       {
//         resource: [gridSize * 0.8, gridSize * 0.7],
//         geo: [gridSize * 0.4, gridSize * 0.4]
//       },
//       {
//         resource: [gridSize * 0.2, gridSize * 0.7],
//         geo: [gridSize * 0.1, gridSize * 0.4]
//       }
//     ]
//     georeferencedMap1.gcps = [
//       {
//         resource: [gridSize * 0.2, gridSize * 0.3],
//         geo: [gridSize * 0.1, gridSize * 0.6]
//       },
//       {
//         resource: [gridSize * 0.8, gridSize * 0.3],
//         geo: [gridSize * 0.4, gridSize * 0.6]
//       },
//       {
//         resource: [gridSize * 0.8, gridSize * 0.9],
//         geo: [gridSize * 0.4, gridSize * 0.9]
//       },
//       {
//         resource: [gridSize * 0.2, gridSize * 0.9],
//         geo: [gridSize * 0.1, gridSize * 0.9]
//       }
//     ]
//     georeferencedMap0.rcps = [
//       {
//         id: '0',
//         resource: [gridSize * 0.5, gridSize * 0.9]
//       }
//     ]
//     georeferencedMap1.rcps = [
//       {
//         id: '0',
//         resource: [gridSize * 0.5, gridSize * 0.1]
//       }
//     ]
//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps(
//         [georeferencedMap0, georeferencedMap1],
//         {
//           type: 'thinPlateSpline',
//           differentHandedness: false,
//           internalProjection: {
//             definition: 'EPSG:4326'
//           },
//           projection: {
//             definition: 'EPSG:4326'
//           }
//         }
//       )
//     const results = stapledtransformation.toGeoreferencedMaps()

//     expect(results[0].gcps.length).to.equal(5)
//     expect(results[1].gcps.length).to.equal(5)

//     // console.log(new Matrix(stapledtransformation.destinationPointsArrays))
//     // console.log(new Matrix(stapledtransformation.coefsArrayMatrix))
//     // console.log(new Matrix(stapledtransformation.weightsArrays))
//     // console.log(results[0].gcps, results[1].gcps)

//     expectToBeCloseToArray(results[0].gcps[4].geo, [50, 100])
//     expectToBeCloseToArray(results[1].gcps[4].geo, [50, 100])
//   })
// })

// describe('Solve two maps stapled together and evaluate points', () => {
//   it(`should return maps with extra gcps`,  () => {
//     const georeferencedMap1 = {
//       '@context': 'https://schemas.allmaps.org/map/2/context.json',
//       type: 'GeoreferencedMap',
//       id: 'https://annotations.allmaps.org/maps/8b639501c40f2178',
//       created: '2025-02-17T21:59:56.485Z',
//       modified: '2025-02-17T21:59:56.485Z',
//       resource: {
//         id: 'https://sammeltassen.nl/iiif-images/stadsarchief-rotterdam/NL-RtSA_4201_I-118-1',
//         width: 5434,
//         height: 10536,
//         type: 'ImageService2',
//         partOf: [
//           {
//             id: 'https://sammeltassen.nl/iiif-images/stadsarchief-rotterdam/NL-RtSA_4201_I-118-1',
//             type: 'Canvas',
//             partOf: [
//               {
//                 id: 'https://sammeltassen.nl/iiif-manifests/stadsarchief-rotterdam/NL-RtSA_4201_I-118.json',
//                 type: 'Manifest',
//                 label: {
//                   en: ['Plattegrond van Rotterdam in 10 bladen (1895-1897)']
//                 }
//               }
//             ]
//           }
//         ]
//       },
//       gcps: [
//         {
//           resource: [3478, 6315],
//           geo: [4.4305768, 51.9133267]
//         },
//         {
//           resource: [5306, 5332],
//           geo: [4.4404524, 51.9184028]
//         },
//         {
//           resource: [4560, 5703],
//           geo: [4.4363765, 51.9164375]
//         },
//         {
//           resource: [4371, 6758],
//           geo: [4.4365357, 51.9123644]
//         }
//       ],
//       resourceMask: [
//         [199, 10340],
//         [194, 312],
//         [5333, 293],
//         [5356, 10330]
//       ],
//       transformation: {
//         type: 'polynomial',
//         options: {
//           order: 1
//         }
//       }
//     }
//     const rcps1 = [{ id: 'test', resource: [5333, 293] }]
//     const georeferencedMap2 = {
//       '@context': 'https://schemas.allmaps.org/map/2/context.json',
//       type: 'GeoreferencedMap',
//       id: 'https://annotations.allmaps.org/maps/a27f86193c1eb9b5',
//       created: '2025-02-22T18:35:54.565Z',
//       modified: '2025-02-22T18:35:54.565Z',
//       resource: {
//         id: 'https://sammeltassen.nl/iiif-images/stadsarchief-rotterdam/NL-RtSA_4201_I-118-2',
//         width: 5410,
//         height: 10476,
//         type: 'ImageService2',
//         partOf: [
//           {
//             id: 'https://sammeltassen.nl/iiif-images/stadsarchief-rotterdam/NL-RtSA_4201_I-118-2',
//             type: 'Canvas',
//             partOf: [
//               {
//                 id: 'https://sammeltassen.nl/iiif-manifests/stadsarchief-rotterdam/NL-RtSA_4201_I-118.json',
//                 type: 'Manifest',
//                 label: {
//                   en: ['Plattegrond van Rotterdam in 10 bladen (1895-1897)']
//                 }
//               }
//             ]
//           }
//         ]
//       },
//       gcps: [
//         {
//           resource: [4772, 9966],
//           geo: [4.4745659, 51.9043149]
//         },
//         {
//           resource: [5322, 533],
//           geo: [4.4670337, 51.9400327]
//         },
//         {
//           resource: [4666, 9112],
//           geo: [4.4729223, 51.9075223]
//         },
//         {
//           resource: [90, 1444],
//           geo: [4.4358105, 51.9327759]
//         }
//       ],
//       resourceMask: [
//         [87, 254],
//         [5335, 235],
//         [5343, 10288],
//         [66, 10295]
//       ],
//       transformation: {
//         type: 'polynomial',
//         options: {
//           order: 1
//         }
//       }
//     }
//     const rcps2 = [{ id: 'test', resource: [87, 254] }]

//     georeferencedMap1.rcps = rcps1
//     georeferencedMap2.rcps = rcps2
//     const stapledtransformation =
//        StapledTransformation.fromGeoreferencedMaps(
//         [georeferencedMap1, georeferencedMap2],
//         {
//           differentHandedness: false,
//           transformationType: 'thinPlateSpline'
//         }
//       )
//     const results = stapledtransformation.toGeoreferencedMaps()

//     console.log(
//       JSON.stringify(generateAnnotation(results))
//       // `https://viewer.allmaps.org/?data=${encodeURIComponent(JSON.stringify(generateAnnotation(results[0])))}`
//     )
//     console.log(
//       results.map((georeferencedMap) => georeferencedMap.gcps).flat(1)
//     )
//   })
// })
