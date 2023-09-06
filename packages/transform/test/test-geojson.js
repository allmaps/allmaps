import { describe, it } from 'mocha'
import { expect } from 'chai'

import { GCPTransformer } from '../dist/index.js'

import { gcps6 } from './input/gcps-test.js'

function expectToBeCloseToArrayArray(actual, expected, epsilon = 0.00001) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n0, i0) =>
    n0.forEach((n1, i1) =>
      expect(n1).to.be.approximately(expected[i0][i1], epsilon)
    )
  )
}

describe('To geo polygon transformer ', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GCPTransformer(gcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [4.388957777030093, 51.959084191571606],
    [4.390889520773774, 51.94984430356657],
    [4.392938913951547, 51.94062947962427],
    [4.409493277493718, 51.94119110133424],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975],
    [4.404906205946158, 51.959549039424715]
  ]

  it(`should have the right output`, () => {
    expectToBeCloseToArrayArray(
      transformer.toGeoPolygon(input, transformOptions),
      output
    )
  })
})

describe('To resource polygon transformer', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GCPTransformer(gcps6, 'thinPlateSpline')
  const input = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.420666790347598, 51.959985351835975]
  ]
  const output = [
    [1032.5263837176526, 992.2883187637146],
    [1045.0268036997886, 1489.293879156599],
    [1056.6257766352364, 1986.6566391349374],
    [1520.5132800975002, 1995.126987432735],
    [1972.2719445148632, 2006.6657102722945],
    [1969.4605377858998, 1507.0986848843686],
    [1957.822599920541, 1009.7982201488556],
    [1495.754239007751, 1000.8172824356742]
  ]

  it(`should have the right output`, () => {
    expectToBeCloseToArrayArray(
      transformer.toResourcePolygon(input, transformOptions),
      output
    )
  })
})
