import { describe, it } from 'mocha'
import { expect } from 'chai'

import { GCPTransformer } from '../dist/index.js'

import { gcps6, transformGcps6, gcps7 } from './input/gcps-test.js'

function expectToBeCloseToArrayArray(actual, expected, epsilon = 0.00001) {
  expect(actual.length).to.equal(expected.length)
  actual.forEach((n0, i0) =>
    n0.forEach((n1, i1) =>
      expect(n1).to.be.approximately(expected[i0][i1], epsilon)
    )
  )
}

describe('Transform line to geo', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.01,
    maxDepth: 1,
    geographic: false
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
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should transform a line with midpoints, without closing it`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForwardLineStringToLineString(
        input,
        transformOptions
      ),
      output
    )
  })
})

describe('Transform line to geo from transform gcps', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.01,
    maxDepth: 1,
    geographic: false
  }
  const transformer = new GCPTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should transform a line with midpoints, without closing it`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForwardLineStringToLineString(
        input,
        transformOptions
      ),
      output
    )
  })
})

describe('Transform line to geo, with geographic functions', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.01,
    maxDepth: 1,
    geographic: true
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
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should transform a line with midpoints, without closing it`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForwardLineStringToLineString(
        input,
        transformOptions
      ),
      output
    )
  })
})

describe('Transform line to resource, with geographic functions', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 2,
    geographic: true
  }
  const transformer = new GCPTransformer(gcps7, 'polynomial')
  const input = [
    [10, 50],
    [50, 50]
  ]
  const output = [
    [31.06060606060611, 155.30303030303048],
    [80.91200458875993, 165.7903106766409],
    [133.1658635549907, 174.5511756850417],
    [185.89024742146262, 181.22828756380306],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should transform a horizontal line with midpoints (and without closing it)`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackwardLineStringToLineString(
        input,
        transformOptions
      ),
      output
    )
  })
})

describe('Transform line to resource, with geographic functions', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 2,
    geographic: true
  }
  const transformer = new GCPTransformer(gcps7, 'polynomial')
  const input = [
    [50, 10],
    [50, 50]
  ]
  const output = [
    [258.3333333333333, 91.66666666666677],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should transform a vertical line without midpoints (and without closing it)`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackwardLineStringToLineString(
        input,
        transformOptions
      ),
      output
    )
  })
})

describe('Transform polygon to geo ', async () => {
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
      transformer.transformForwardRingToRing(input, transformOptions),
      output
    )
  })
})

describe('Transform polygon to geo as geojson ', async () => {
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
  const output = {
    type: 'Polygon',
    coordinates: [
      [
        [4.388957777030093, 51.959084191571606],
        [4.390889520773774, 51.94984430356657],
        [4.392938913951547, 51.94062947962427],
        [4.409493277493718, 51.94119110133424],
        [4.425874493300959, 51.94172557475595],
        [4.4230497784967655, 51.950815146974556],
        [4.420666790347598, 51.959985351835975],
        [4.404906205946158, 51.959549039424715],
        [4.388957777030093, 51.959084191571606]
      ]
    ]
  }

  it(`should have the right output`, () => {
    expect(
      transformer.transformForwardRingToGeoJSONPolygon(input, transformOptions)
    ).to.deep.equal(output)
  })
})

describe('Transform polygon to resource', async () => {
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
      transformer.transformBackwardRingToRing(input, transformOptions),
      output
    )
  })

  describe('Transform polygon as geojson to resource', async () => {
    const transformOptions = {
      maxOffsetRatio: 0.00001,
      maxDepth: 1
    }
    const transformer = new GCPTransformer(gcps6, 'thinPlateSpline')
    const input = {
      type: 'Polygon',
      coordinates: [
        [
          [4.388957777030093, 51.959084191571606],
          [4.392938913951547, 51.94062947962427],
          [4.425874493300959, 51.94172557475595],
          [4.420666790347598, 51.959985351835975],
          [4.388957777030093, 51.959084191571606]
        ]
      ]
    }
    const output = [
      [1032.5263837176526, 992.2883187637146],
      [1045.038670070595, 1489.2938524267215],
      [1056.6257766352364, 1986.6566391349374],
      [1520.5146305339294, 1995.064826625076],
      [1972.2719445148632, 2006.6657102722945],
      [1969.4756718048366, 1507.0983522493168],
      [1957.822599920541, 1009.7982201488556],
      [1495.7555378955249, 1000.7599463685738]
    ]

    it(`should have the right output`, () => {
      expect(
        transformer.transformBackwardGeoJSONPolygonToRing(
          input,
          transformOptions
        )
      ).to.deep.equal(output)
    })
  })
})
