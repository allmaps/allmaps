import { describe, it } from 'mocha'

import {
  expectToBeCloseToArray,
  expectToBeCloseToArrayArray
} from '../../stdlib/test/helper-functions.js'

import { GcpTransformer } from '../../transform/dist/index.js'
import { ProjectedGcpTransformer, proj4 } from '../dist/index.js'

import { gcps6 } from './input/gcps-test.js'
import {
  epsg28992,
  epsg31370,
  epsg31370projjson,
  epsg3857,
  epsg4326
} from './input/projections-test.js'

describe('Projected Transform LineString Forward To LineString with EPSG:4326 internal projection and projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1,
    internalProjection: epsg4326,
    projection: epsg4326
  }
  const transformer = new GcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const resourceLineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]

  it(`should give the same result as an unprojected transformer`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      transformer.transformToGeo(resourceLineString)
    )
  })
})

describe('Projected Transform LineString Forward To LineString with default EPSG:3857 internal projection and projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const resourceLineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const projectedGeoLineString = [
    [488576.54485216417, 6792728.737533841],
    [488791.58558205474, 6791060.980263279],
    [489019.72298704047, 6789397.710447973],
    [490862.5463069625, 6789498.9693025835],
    [492686.09490919975, 6789595.307889521],
    [492371.6490955601, 6791235.9925656635],
    [492106.37606822746, 6792891.1754726]
  ]

  it(`should transform the lineString to webmercator and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})

describe('Projected Transform LineString Forward To LineString with default EPSG:3857 internal projection and projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const resourceLineString = [
    [3655, 2212],
    [2325, 3134],
    [3972, 325],
    [3451, 2876],
    [2067, 920],
    [622, 941]
  ]
  const projectedGeoLineString = [
    [498246.8195647142, 6789061.316027705],
    [496595.9732655353, 6787546.801212325],
    [494783.7898554361, 6785995.114473057],
    [496391.8586632488, 6790623.562354985],
    [498497.64212101337, 6795403.988950945],
    [498135.8154413349, 6791100.393518668],
    [498076.9264938777, 6786883.571136022],
    [495239.5461210053, 6790036.9871731205],
    [492300.2095900435, 6793167.011607833],
    [489770.9992948517, 6793018.672759057],
    [487201.94796965295, 6792860.379165613]
  ]

  it(`should transform the lineString to webmercator and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})

describe('Projected Transform LineString Forward To LineString with EPSG:31370 internal projection and default EPSG:3857 projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1,
    internalProjection: epsg31370
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const resourceLineString = [
    [3655, 2212],
    [2325, 3134],
    [3972, 325],
    [3451, 2876],
    [2067, 920],
    [622, 941]
  ]
  const projectedGeoLineString = [
    [498247.196090505, 6789061.7676701555],
    [496596.0857961293, 6787546.818863111],
    [494783.8626652385, 6785995.157771795],
    [496392.4627162781, 6790624.950878147],
    [498501.57678734255, 6795410.032138047],
    [498137.15972611686, 6791102.130838948],
    [498076.85849569837, 6786883.389086489],
    [495239.9136289843, 6790037.973029668],
    [492298.9972965987, 6793169.702451241],
    [489767.88734149706, 6793019.906716891],
    [487196.5540720398, 6792859.377809678]
  ]
  // Note: all points are different, not just the midpoints

  it(`should transform the lineString to webmercator, via an internal EPSG:31370 projection which results in other points`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})

describe('Projected Transform LineString Forward To LineString with EPSG:31370 internal projection and EPSG:31370 projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1,
    internalProjection: epsg31370,
    projection: epsg31370
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const resourceLineString = [
    [3655, 2212],
    [2325, 3134],
    [3972, 325],
    [3451, 2876],
    [2067, 920],
    [622, 941]
  ]
  const projectedGeoLineString = [
    [157364.72155813803, 292213.3880919358],
    [156345.5951194615, 291278.16064894106],
    [155226.52356937024, 290320.2264339132],
    [156217.41595393256, 293175.2561051091],
    [157516.11682170592, 296124.98325977474],
    [157294.9165920899, 293470.7466456862],
    [157261.3838685806, 290870.3819669662],
    [155505.73158458815, 292812.6936025433],
    [153687.2076241993, 294740.744872259],
    [152123.9340341536, 294647.5555558782],
    [150535.76008321813, 294548.22782318294]
  ]

  it(`should transform the lineString to EPSG:31370 projection, and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})

describe('Projected Transform LineString Forward To LineString with EPSG:31370 internal projection and EPSG:28992 projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1,
    internalProjection: epsg31370,
    projection: epsg28992
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const resourceLineString = [
    [3655, 2212],
    [2325, 3134],
    [3972, 325],
    [3451, 2876],
    [2067, 920],
    [622, 941]
  ]
  const projectedGeoLineString = [
    [92171.96319801327, 439250.7392195241],
    [91140.1318550074, 438330.2059945731],
    [90008.06902330121, 437388.3781427277],
    [91038.64166624477, 440228.31014306704],
    [92378.19922071013, 443158.54244443506],
    [92119.83597131, 440508.5490631829],
    [92049.81893950628, 437909.7404415105],
    [90322.16486404435, 439875.89373726887],
    [88531.49536626287, 441828.6782593381],
    [86967.57638718556, 441757.502798549],
    [85378.67808803722, 441680.55210508476]
  ]

  it(`should transform the lineString to EPSG:31370 projection, and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})

describe('Allow to change a projection of a transformer', async () => {
  const projectedTransformer4326 = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    {
      minOffsetRatio: 0.01,
      maxDepth: 1,
      internalProjection: epsg3857,
      projection: epsg4326
    }
  )
  const projectedTransformer31370 = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    {
      minOffsetRatio: 0.01,
      maxDepth: 1,
      internalProjection: epsg3857,
      projection: epsg31370
    }
  )
  const projectedTransformer31370setTo4326 =
    projectedTransformer31370.setProjection(epsg4326)

  const resourceLineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]

  it(`should give the same result as a transformer that was given that projection on construction`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer4326.transformToGeo(resourceLineString),
      projectedTransformer31370setTo4326.transformToGeo(resourceLineString)
    )
  })
})

describe('Allow to modify the requested projection in a transform function', async () => {
  const projectedTransformer4326 = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    {
      minOffsetRatio: 0.01,
      maxDepth: 1,
      internalProjection: epsg3857,
      projection: epsg4326
    }
  )
  const projectedTransformer31370 = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    {
      minOffsetRatio: 0.01,
      maxDepth: 1,
      internalProjection: epsg3857,
      projection: epsg31370
    }
  )

  const resourceLineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]

  it(`should give the same result as a transformer that was given that projection on construction`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer4326.transformToGeo(resourceLineString),
      projectedTransformer31370.transformToGeo(resourceLineString, {
        projection: epsg4326
      })
    )
  })
})

describe('Support PROJJSON projections', async () => {
  it(`should give the same result as a proj4-string`, () => {
    expectToBeCloseToArray(
      proj4(epsg31370.definition, [4, 51]),
      proj4(epsg31370projjson.definition, [4, 51])
    )
  })

  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1,
    internalProjection: epsg31370,
    projection: epsg31370
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptions
  )
  const transformerOptionsProjjson = {
    minOffsetRatio: 0.001,
    maxDepth: 1,
    internalProjection: epsg31370projjson,
    projection: epsg31370projjson
  }
  const projectedTransformerProjjson = new ProjectedGcpTransformer(
    gcps6,
    'thinPlateSpline',
    transformerOptionsProjjson
  )
  const resourceLineString = [
    [3655, 2212],
    [2325, 3134],
    [3972, 325],
    [3451, 2876],
    [2067, 920],
    [622, 941]
  ]

  it(`should transform the lineString to EPSG:31370 projection in the same way with a proj4-string and a PROJJSON object`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedTransformerProjjson.transformToGeo(resourceLineString)
    )
  })
})
