import { describe, it } from 'mocha'

import { expectToBeCloseToArrayArray } from '../../stdlib/test/helper-functions.js'

import { GcpTransformer } from '../../transform/dist/index.js'
import { ProjectedGcpTransformer } from '../dist/index.js'

import { gcps6, gcps6nad } from './input/gcps-test.js'

describe('Projected Transform LineString Forward To LineString with EPSG:4326 internal projection and projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1,
    internalProjection: 'EPSG:4326',
    projection: 'EPSG:4326'
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
    gcps6nad,
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
    [-9026177.672071297, 2891300.5329870014],
    [-9373198.174393559, 2654148.626758824],
    [-9662850.753461177, 2421514.565058184],
    [-9323574.366573505, 3126157.1118264655],
    [-8894441.863840025, 3865199.098714333],
    [-9011249.09650844, 3203250.985397358],
    [-9140112.157890854, 2558728.807026262],
    [-9529235.163058229, 3035139.8385587526],
    [-9963856.508100005, 3509362.762248845],
    [-10279457.661673792, 3487086.428862622],
    [-10573741.366662772, 3465181.0312209423]
  ]

  console.log(projectedTransformer.transformToGeo(resourceLineString))

  it(`should transform the lineString to webmercator and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})

describe('Projected Transform LineString Forward To LineString with EPSG:4269 internal projection and default EPSG:3857 projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1,
    internalProjection: 'EPSG:4269'
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6nad,
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
    [-9026177.67207128, 2891300.5329870014],
    [-9373198.174393559, 2651935.190468196],
    [-9662850.75346119, 2421514.5650581755],
    [-9323574.366573494, 3122803.2380395485],
    [-8894441.863839984, 3865199.0987143135],
    [-9011249.096508412, 3199299.664478264],
    [-9140112.157890843, 2558728.807026257],
    [-9529235.163058225, 3030702.536815768],
    [-9963856.508100009, 3509362.762248825],
    [-10279457.661673812, 3487169.5021216697],
    [-10573741.36666281, 3465181.031220897]
  ]

  it(`should transform the lineString to webmercator, via an internal EPSG:4269 projection which results in other midpoints`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})

describe('Projected Transform LineString Forward To LineString with EPSG:4269 internal projection and EPSG:4269 projection', async () => {
  const transformerOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 1,
    internalProjection: 'EPSG:4269',
    projection: 'EPSG:4269'
  }
  const projectedTransformer = new ProjectedGcpTransformer(
    gcps6nad,
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
    [-81.0835336000001, 25.126583099999987],
    [-84.20087181138936, 23.164590032768515],
    [-86.80286520000027, 21.248334399999994],
    [-83.75509356117973, 26.99464907818738],
    [-79.90013070000043, 32.772901599999905],
    [-80.94942792401763, 27.60528401420956],
    [-82.10702450000015, 22.392612600000007],
    [-85.60257592944397, 26.255034795069125],
    [-89.50684590000033, 30.045212099999933],
    [-92.34193929941138, 29.872485116151132],
    [-94.98553480000086, 29.701056499999883]
  ]

  it(`should transform the lineString to EPSG:4269 projection, and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      projectedTransformer.transformToGeo(resourceLineString),
      projectedGeoLineString
    )
  })
})
