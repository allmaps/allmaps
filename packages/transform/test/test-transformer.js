import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  geojsonGeometriesToGeojsonFeatureCollection,
  geometryToGeojsonGeometry
} from '@allmaps/stdlib'

import {
  expectToBeCloseToArrayArray,
  expectToBeCloseToArrayArrayArray
} from '../../stdlib/test/helper-functions.js'

import { GcpTransformer } from '../dist/index.js'

import { generalGcps6, gcps6, generalGcps7 } from './input/gcps-test.js'

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minOffsetRatio', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
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

  it(`should transform the lineString (without closing) and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minOffsetRatio = 0', async () => {
  const transformOptions = {
    minOffsetRatio: 0,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
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
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should transform the lineString (without closing) and add all midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minOffsetDistance', async () => {
  const transformOptions = {
    minOffsetRatio: Infinity,
    minOffsetDistance: 0.0001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
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

  it(`should transform the lineString (without closing) and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minLineDistance', async () => {
  const transformOptions = {
    minOffsetRatio: Infinity,
    minLineDistance: 0.02,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.409493277493718, 51.94119110133424],
    [4.425874493300959, 51.94172557475595],
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should transform the lineString (without closing) and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and input as GCP instead of GeneralGCP', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
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

  it(`should give the same result as with input as GeneralGCP`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and destinationIsGeographic = true', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
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

  it(`should transform the lineString (without closing) and add no midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Backward To LineString of horizontal line, with destinationIsGeographic = true and maxDepth = 2', async () => {
  const transformOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(generalGcps7, 'polynomial')
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

  it(`should transform the lineString (without closing) and add two layers of midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Backward To LineString of vertical line, with destinationIsGeographic = true and maxDepth = 2', async () => {
  const transformOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(generalGcps7, 'polynomial')
  const input = [
    [50, 10],
    [50, 50]
  ]
  const output = [
    [258.3333333333333, 91.66666666666677],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should transform the lineString (without closing) and add no midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Backward To LineString, with destinationIsGeographic as true', async () => {
  const transformOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(generalGcps7, 'polynomial')
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

  it(`should give almost the same result as transforming from lineString, since the geographic distance and midpoint functions are used`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform MultiPoint Backward To MultiPoint', async () => {
  const transformOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 2,
    isMultiGeometry: true
  }
  const transformer = new GcpTransformer(generalGcps7, 'polynomial')
  const input = [
    [10, 50],
    [50, 50]
  ]
  const output = [
    [31.06060606060611, 155.30303030303048],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should recognise multi geometry and transform the points piecewise, not considering the input as lineString, and hence not add midpoints and ignore lineString options`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform Polygon Forward To Polygon, with minOffsetRatio very small', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
  const input = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 1000]
    ]
  ]
  const output = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.390889520773774, 51.94984430356657],
      [4.392938913951547, 51.94062947962427],
      [4.409493277493718, 51.94119110133424],
      [4.425874493300959, 51.94172557475595],
      [4.4230497784967655, 51.950815146974556],
      [4.420666790347598, 51.959985351835975],
      [4.404906205946158, 51.959549039424715]
    ]
  ]

  it(`should transform the polygon (without closing) and add midpoints everywhere, including between first and last point`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform Polygon Forward, with minOffsetRatio very small, and convert to GeoJSON Polygon', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
  const input = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 1000]
    ]
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

  it(`should give the same result as transforming to polygon, but as GeoJSON Polygon and therefore closed`, () => {
    expect(
      geometryToGeojsonGeometry(
        transformer.transformForward(input, transformOptions)
      )
    ).to.deep.equal(output)
  })
})

describe('Transform unconformed Polygon Forward To Polygon, with minOffsetRatio very small', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
  const input = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 2000], // repetition
      [2000, 1000],
      [1000, 1000] // closed
    ]
  ]
  const output = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.390889520773774, 51.94984430356657],
      [4.392938913951547, 51.94062947962427],
      [4.409493277493718, 51.94119110133424],
      [4.425874493300959, 51.94172557475595],
      [4.4230497784967655, 51.950815146974556],
      [4.420666790347598, 51.959985351835975],
      [4.404906205946158, 51.959549039424715]
    ]
  ]

  it(`should accept this unconformed input too and give the same result as transforming to polygon`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform Polygon Backward To Polygon, with minOffsetRatio very small', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
  const input = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.392938913951547, 51.94062947962427],
      [4.425874493300959, 51.94172557475595],
      [4.420666790347598, 51.959985351835975]
    ]
  ]
  const output = [
    [
      [1032.5263837176526, 992.2883187637146],
      [1045.0268036997886, 1489.293879156599],
      [1056.6257766352364, 1986.6566391349374],
      [1520.5132800975002, 1995.126987432735],
      [1972.2719445148632, 2006.6657102722945],
      [1969.4605377858998, 1507.0986848843686],
      [1957.822599920541, 1009.7982201488556],
      [1495.754239007751, 1000.8172824356742]
    ]
  ]

  it(`should transform the polygon (without closing) and add midpoints everywhere, including on between first and last point`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })

  describe('Transform MultiPolygon Backward To MultiPolygon, using isMultiGeometry = true', async () => {
    const transformOptions = {
      minOffsetRatio: 0.00001,
      maxDepth: 1,
      isMultiGeometry: true
    }
    const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
    const input = [
      [
        [
          [4.388957777030093, 51.959084191571606],
          [4.392938913951547, 51.94062947962427],
          [4.425874493300959, 51.94172557475595],
          [4.420666790347598, 51.959985351835975]
        ]
      ]
    ]
    const output = [
      [
        [
          [1032.5263837176526, 992.2883187637146],
          [1045.0268036997886, 1489.293879156599],
          [1056.6257766352364, 1986.6566391349374],
          [1520.5132800975002, 1995.126987432735],
          [1972.2719445148632, 2006.6657102722945],
          [1969.4605377858998, 1507.0986848843686],
          [1957.822599920541, 1009.7982201488556],
          [1495.754239007751, 1000.8172824356742]
        ]
      ]
    ]

    it(`should give the same result as transforming from geojson polygon`, () => {
      expect(
        transformer.transformBackward(input, transformOptions)
      ).to.deep.equal(output)
    })
  })
})

describe('Transform SVG string Backward To Polygon', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
  const input =
    '<svg><polygon points="4.388957777030093,51.959084191571606 4.392938913951547,51.94062947962427 4.425874493300959,51.94172557475595 4.420666790347598,51.959985351835975" /></svg>'
  let output = geojsonGeometriesToGeojsonFeatureCollection(
    geometryToGeojsonGeometry([
      [
        [1032.5263837176526, 992.2883187637146],
        [1045.038670070595, 1489.2938524267215],
        [1056.6257766352364, 1986.6566391349374],
        [1520.5146305339294, 1995.064826625076],
        [1972.2719445148632, 2006.6657102722945],
        [1969.4756718048366, 1507.0983522493168],
        [1957.822599920541, 1009.7982201488556],
        [1495.7555378955249, 1000.7599463685738]
      ]
    ])
  )

  it(`should give the same result as transforming from geojson polygon`, () => {
    expect(
      transformer.transformSvgStringToGeojsonFeatureCollection(
        input,
        transformOptions
      )
    ).to.deep.equal(output)
  })
})

describe('Transform LineString Forward To LineString, with reading out the source', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(generalGcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1500],
    [2000, 1000]
  ]

  it(`should give the same result as with normal, but return the corresponding points in the source domain`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(
        input,
        transformOptions,
        (generalGcp) => generalGcp.source
      ),
      output
    )
  })
})
