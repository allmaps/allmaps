import { describe, expect, test } from 'vitest'

import {
  isClosed,
  isPoint,
  isLineString,
  isPolygon,
  conformLineString,
  conformPolygon,
  polygonToGeojsonPolygon
} from '../src/geometry.js'

import {
  isGeojsonPoint,
  isGeojsonLineString,
  isGeojsonPolygon,
  geojsonPolygonToPolygon,
  geojsonGeometryToGeometry
} from '../src/geojson.js'

import {
  pointGeo,
  geojsonPointGeo,
  lineStringGeo,
  geojsonLineStringGeo,
  geojsonLineStringGeoMultipleCoordinates,
  ringGeo,
  ringGeoClosed,
  polygonGeo,
  geojsonPolygonGeo,
  lineStringGeoUnconformed,
  lineStringGeoWrong,
  polygonGeoClosed,
  polygonGeoUnconformed,
  polygonGeoWrong
} from './input/geometry.js'

describe('isClosed()', () => {
  test(`should return false on LineString`, () => {
    expect(isClosed(lineStringGeo)).to.be.false
  })

  test(`should return false on Ring`, () => {
    expect(isClosed(ringGeo)).to.be.false
  })

  test(`should return true on closed Ring`, () => {
    expect(isClosed(ringGeoClosed)).to.be.true
  })
})

describe('isPoint()', async () => {
  test(`should return true on Point`, () => {
    expect(isPoint(pointGeo)).to.be.true
  })

  test(`should return false on LineString`, () => {
    expect(isPoint(lineStringGeo)).to.be.false
  })

  test(`should return false on Polygon`, () => {
    expect(isPoint(polygonGeo)).to.be.false
  })

  test(`should return false on Geojson point`, () => {
    expect(isPoint(geojsonPointGeo)).to.be.false
  })

  test(`should return false on Geojson lineString`, () => {
    expect(isPoint(geojsonLineStringGeo)).to.be.false
  })

  test(`should return false on Geojson polygon`, () => {
    expect(isPoint(geojsonPolygonGeo)).to.be.false
  })
})

describe('isLineString()', async () => {
  test(`should return false on Point`, () => {
    expect(isLineString(pointGeo)).to.be.false
  })

  test(`should return true on LineString`, () => {
    expect(isLineString(lineStringGeo)).to.be.true
  })

  // it(`should return false on closed Ring`, () => {
  //   expect(isLineString(ringGeoClosed)).to.be.false
  // })

  test(`should return false on Polygon`, () => {
    expect(isLineString(polygonGeo)).to.be.false
  })

  test(`should return false on Geojson point`, () => {
    expect(isLineString(geojsonPointGeo)).to.be.false
  })

  test(`should return false on Geojson lineString`, () => {
    expect(isLineString(geojsonLineStringGeo)).to.be.false
  })

  test(`should return false on Geojson polygon`, () => {
    expect(isLineString(geojsonPolygonGeo)).to.be.false
  })
})

describe('isPolygon()', async () => {
  test(`should return false on Point`, () => {
    expect(isPolygon(pointGeo)).to.be.false
  })

  test(`should return false on LineString`, () => {
    expect(isPolygon(lineStringGeo)).to.be.false
  })

  test(`should return true on Polygon`, () => {
    expect(isPolygon(polygonGeo)).to.be.true
  })

  // it(`should return false on closed Polygon`, () => {
  //   expect(isPolygon(polygonGeoClosed)).to.be.false
  // })

  test(`should return false on Geojson point`, () => {
    expect(isPolygon(geojsonPointGeo)).to.be.false
  })

  test(`should return false on Geojson lineString`, () => {
    expect(isPolygon(geojsonLineStringGeo)).to.be.false
  })

  test(`should return false on Geojson polygon`, () => {
    expect(isPolygon(geojsonPolygonGeo)).to.be.false
  })
})

describe('isGeojsonPoint()', async () => {
  test(`should return false on Point`, () => {
    expect(isGeojsonPoint(pointGeo)).to.be.false
  })

  test(`should return false on LineString`, () => {
    expect(isGeojsonPoint(lineStringGeo)).to.be.false
  })

  test(`should return false on Polygon`, () => {
    expect(isGeojsonPoint(polygonGeo)).to.be.false
  })

  test(`should return true on Geojson Point`, () => {
    expect(isGeojsonPoint(geojsonPointGeo)).to.be.true
  })

  test(`should return false on Geojson LineString`, () => {
    expect(isGeojsonPoint(geojsonLineStringGeo)).to.be.false
  })

  test(`should return false on Geojson Polygon`, () => {
    expect(isGeojsonPoint(geojsonPolygonGeo)).to.be.false
  })
})

describe('isGeojsonLineString()', async () => {
  test(`should return false on Point`, () => {
    expect(isGeojsonLineString(pointGeo)).to.be.false
  })

  test(`should return false on LineString`, () => {
    expect(isGeojsonLineString(lineStringGeo)).to.be.false
  })

  test(`should return false on Polygon`, () => {
    expect(isGeojsonLineString(polygonGeo)).to.be.false
  })

  test(`should return false on Geojson Point`, () => {
    expect(isGeojsonLineString(geojsonPointGeo)).to.be.false
  })

  test(`should return true on Geojson LineString, even with multiple coordinates`, () => {
    expect(isGeojsonLineString(geojsonLineStringGeo)).to.be.true
    expect(isGeojsonLineString(geojsonLineStringGeoMultipleCoordinates)).to.be
      .true
  })

  test(`should return false on Geojson Polygon`, () => {
    expect(isGeojsonLineString(geojsonPolygonGeo)).to.be.false
  })
})

describe('isGeojsonPolygon()', async () => {
  test(`should return false on Point`, () => {
    expect(isGeojsonPolygon(pointGeo)).to.be.false
  })

  test(`should return false on LineString`, () => {
    expect(isGeojsonPolygon(lineStringGeo)).to.be.false
  })

  test(`should return false on Polygon`, () => {
    expect(isGeojsonPolygon(polygonGeo)).to.be.false
  })

  test(`should return false on Geojson Point`, () => {
    expect(isGeojsonPolygon(geojsonPointGeo)).to.be.false
  })

  test(`should return false on Geojson LineString`, () => {
    expect(isGeojsonPolygon(geojsonLineStringGeo)).to.be.false
  })

  test(`should return true on Geojson Polygon`, () => {
    expect(isGeojsonPolygon(geojsonPolygonGeo)).to.be.true
  })
})

describe('conformLineString()', async () => {
  test(`should remove duplicate point`, () => {
    expect(conformLineString(lineStringGeoUnconformed)).to.deep.equal(
      lineStringGeo
    )
  })

  test(`should throw when not enough points`, () => {
    expect(() => conformLineString(lineStringGeoWrong)).to.throw()
  })

  test(`should not throw when enough points`, () => {
    expect(() => conformLineString(lineStringGeo)).to.not.throw()
  })
})

describe('conformPolygon()', async () => {
  test(`should remove duplicate point and unclose`, () => {
    expect(conformPolygon(polygonGeoUnconformed)).to.deep.equal(polygonGeo)
  })

  test(`should throw when not enough points`, () => {
    expect(() => conformPolygon(polygonGeoWrong)).to.throw()
  })

  test(`should not throw when enough points`, () => {
    expect(() => conformPolygon(polygonGeo)).to.not.throw()
  })
})

describe('geojsonPolygonToPolygon()', async () => {
  test(`should not close`, () => {
    expect(geojsonPolygonToPolygon(geojsonPolygonGeo)).to.deep.equal(polygonGeo)
  })
})

describe('geojsonPolygonToPolygon()', async () => {
  test(`should close when asked`, () => {
    expect(geojsonPolygonToPolygon(geojsonPolygonGeo, true)).to.deep.equal(
      polygonGeoClosed
    )
  })
})

describe('polygonToGeojsonPolygon()', async () => {
  test(`should respect Geojson spec`, () => {
    expect(polygonToGeojsonPolygon(polygonGeo)).to.deep.equal(geojsonPolygonGeo)
  })
})

describe('geojsonGeometryToGeometry()', async () => {
  test(`should allow for geojson geometry input with more then two coordinates`, () => {
    expect(
      geojsonGeometryToGeometry(geojsonLineStringGeoMultipleCoordinates)
    ).to.deep.equal(lineStringGeo)
  })
})
