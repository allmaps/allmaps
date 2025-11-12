import { describe, expect, test } from 'vitest'

import { geometryToGeojsonGeometry } from '@allmaps/stdlib'

// TODO: move to test helper file in /test/
import {
  expectToBeCloseToArrayArray,
  expectToBeCloseToArrayArrayArray
} from '../../stdlib/test/helper-functions.js'

import { GcpTransformer } from '../src/index.js'

import { gcps6, gcps7 } from './input/gcps.js'

import type {
  LineString,
  MultiPoint,
  MultiPolygon,
  Polygon
} from '@allmaps/types'

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minOffsetRatio', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourceLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const geoLineString = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  test(`should transform the lineString (without closing) and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToGeo(resourceLineString, transformOptions),
      geoLineString
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minOffsetRatio = 0', async () => {
  const transformOptions = {
    minOffsetRatio: 0,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourceLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const geoLineString: LineString = [
    [4.388957777030093, 51.959084191571606],
    [4.390889520773774, 51.94984430356657],
    [4.392938913951547, 51.94062947962427],
    [4.409493277493718, 51.94119110133424],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  test(`should transform the lineString (without closing) and add all midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToGeo(resourceLineString, transformOptions),
      geoLineString
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minOffsetDistance', async () => {
  const transformOptions = {
    minOffsetRatio: Infinity,
    minOffsetDistance: 0.0001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourceLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const geoLineString: LineString = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  test(`should transform the lineString (without closing) and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToGeo(resourceLineString, transformOptions),
      geoLineString
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and minLineDistance', async () => {
  const transformOptions = {
    minOffsetRatio: Infinity,
    minLineDistance: 0.02,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourceLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const geoLineString: LineString = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.409493277493718, 51.94119110133424],
    [4.425874493300959, 51.94172557475595],
    [4.420666790347598, 51.959985351835975]
  ]

  test(`should transform the lineString (without closing) and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToGeo(resourceLineString, transformOptions),
      geoLineString
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and input as GCP instead of GeneralGCP', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourceLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const geoLineString: LineString = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  test(`should give the same result as with input as GeneralGCP`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToGeo(resourceLineString, transformOptions),
      geoLineString
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and destinationIsGeographic = true', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourceLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const geoLineString: LineString = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.420666790347598, 51.959985351835975]
  ]

  test(`should transform the lineString (without closing) and add no midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToGeo(resourceLineString, transformOptions),
      geoLineString
    )
  })
})

describe('Transform LineString Backward To LineString of horizontal line, with maxDepth = 2', async () => {
  const transformOptions = {
    maxDepth: 2
  }
  const transformer = new GcpTransformer(gcps7, 'polynomial')
  const geoLineString: LineString = [
    [10, 50],
    [50, 50]
  ]
  const resourceLineString: LineString = [
    [31.06060606060611, 155.30303030303048],
    [82.57575757575762, 162.8787878787881],
    [134.09090909090912, 170.45454545454567],
    [185.60606060606065, 178.0303030303033],
    [237.12121212121218, 185.60606060606085]
  ]

  test(`should transform the lineString (without closing) and add two layers of midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToResource(geoLineString, transformOptions),
      resourceLineString
    )
  })
})

describe('Transform LineString Backward To LineString of horizontal line, with destinationIsGeographic = true and maxDepth = 2', async () => {
  const transformOptions = {
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(gcps7, 'polynomial')
  const geoLineString: LineString = [
    [10, 50],
    [50, 50]
  ]
  const resourceLineString: LineString = [
    [31.06060606060611, 155.30303030303048],
    [80.91200458875993, 165.7903106766409],
    [133.1658635549907, 174.5511756850417],
    [185.89024742146262, 181.22828756380306],
    [237.12121212121218, 185.60606060606085]
  ]

  test(`should transform the lineString (without closing) and add two layers of midpoints, with slighly different locations since midpoints computed geographically`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToResource(geoLineString, transformOptions),
      resourceLineString
    )
  })
})

describe('Transform LineString Backward To LineString of vertical line, with destinationIsGeographic = true and maxDepth = 2 and minOffsetRatio = 0.001', async () => {
  const transformOptions = {
    minOffsetRatio: 0.001,
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(gcps7, 'polynomial')
  const geoLineString: LineString = [
    [50, 10],
    [50, 50]
  ]
  const resourceLineString: LineString = [
    [258.3333333333333, 91.66666666666677],
    [237.12121212121218, 185.60606060606085]
  ]

  test(`should transform the lineString (without closing) and add no midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToResource(geoLineString, transformOptions),
      resourceLineString
    )
  })
})

describe('Transform LineString Backward To LineString, with destinationIsGeographic as true', async () => {
  const transformOptions = {
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(gcps7, 'polynomial')
  const geoLineString: LineString = [
    [10, 50],
    [50, 50]
  ]
  const resourceLineString: LineString = [
    [31.06060606060611, 155.30303030303048],
    [80.91200458875993, 165.7903106766409],
    [133.1658635549907, 174.5511756850417],
    [185.89024742146262, 181.22828756380306],
    [237.12121212121218, 185.60606060606085]
  ]

  test(`should give almost the same result as transforming from lineString, since the geographic distance and midpoint functions are used`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToResource(geoLineString, transformOptions),
      resourceLineString
    )
  })
})

describe('Transform MultiPoint Backward To MultiPoint', async () => {
  const transformOptions = {
    isMultiGeometry: true
  }
  const transformer = new GcpTransformer(gcps7, 'polynomial')
  const geoMultiPoint: MultiPoint = [
    [10, 50],
    [50, 50]
  ]
  const resourceMultiPoint: MultiPoint = [
    [31.06060606060611, 155.30303030303048],
    [237.12121212121218, 185.60606060606085]
  ]

  test(`should recognise multi geometry and transform the points piecewise, not considering the input as lineString, and hence not add midpoints and ignore lineString options`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToResource(geoMultiPoint, transformOptions),
      resourceMultiPoint
    )
  })
})

describe('Transform Polygon Forward to polygon, with minOffsetRatio very small', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourcePolygon: Polygon = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 1000]
    ]
  ]
  const geoPolygon = [
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

  test(`should transform the polygon (without closing) and add midpoints everywhere, including between first and last point`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformToGeo(resourcePolygon, transformOptions),
      geoPolygon
    )
  })
})

describe('Transform Polygon Forward to polygon, with minOffsetRatio very small, and convert to GeoJSON Polygon', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourcePolygon: Polygon = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 1000]
    ]
  ]
  const geojsonPolygon = {
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

  test(`should give the same result as transforming to polygon, but as GeoJSON Polygon and therefore closed`, () => {
    expect(
      geometryToGeojsonGeometry(
        transformer.transformToGeo(resourcePolygon, transformOptions)
      )
    ).to.deep.equal(geojsonPolygon)
  })
})

describe('Transform unconformed Polygon forward to polygon, with minOffsetRatio very small', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourcePolygon: Polygon = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 2000], // repetition
      [2000, 1000],
      [1000, 1000] // closed
    ]
  ]
  const geoPolygon: Polygon = [
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

  test(`should accept this unconformed input too and give the same result as transforming to polygon`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformToGeo(resourcePolygon, transformOptions),
      geoPolygon
    )
  })
})

describe('Transform Polygon Backward To Polygon, with minOffsetRatio very small', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const geoPolygon: Polygon = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.392938913951547, 51.94062947962427],
      [4.425874493300959, 51.94172557475595],
      [4.420666790347598, 51.959985351835975]
    ]
  ]
  const resourcePolygon: Polygon = [
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

  test(`should transform the polygon (without closing) and add midpoints everywhere, including on between first and last point`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformToResource(geoPolygon, transformOptions),
      resourcePolygon
    )
  })
})

describe('Transform MultiPolygon Backward To MultiPolygon, using isMultiGeometry = true', async () => {
  const transformOptions = {
    minOffsetRatio: 0.00001,
    maxDepth: 1,
    isMultiGeometry: true
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const geoMultiPolygon: MultiPolygon = [
    [
      [
        [4.388957777030093, 51.959084191571606],
        [4.392938913951547, 51.94062947962427],
        [4.425874493300959, 51.94172557475595],
        [4.420666790347598, 51.959985351835975]
      ]
    ]
  ]
  const resourceMultiPolygon = [
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

  test(`should give the same result as transforming from geojson polygon`, () => {
    expect(
      transformer.transformToResource(geoMultiPolygon, transformOptions)
    ).to.deep.equal(resourceMultiPolygon)
  })
})

describe('Transform LineString Forward To LineString, with reading out the source', async () => {
  const transformOptions = {
    minOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const resourceLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const geoLineString: LineString = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1500],
    [2000, 1000]
  ]

  test(`should give the same result as with normal, but return the corresponding points in the source domain`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformToGeo(
        resourceLineString,
        transformOptions,
        (gcp) => gcp.resource
      ),
      geoLineString
    )
  })
})
