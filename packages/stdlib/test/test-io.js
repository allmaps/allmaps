import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  isClosed,
  isPosition,
  isLineString,
  isPolygon,
  isGeoJSONPoint,
  isGeoJSONLineString,
  isGeoJSONPolygon,
  conformLineString,
  conformPolygon,
  convertGeoJSONPolygonToPolygon,
  convertPolygonToGeoJSONPolygon
} from '../dist/io.js'

import {
  positionGeo,
  geoJSONPointGeo,
  lineStringGeo,
  geoJSONLineStringGeo,
  ringGeo,
  ringGeoClosed,
  polygonGeo,
  geoJSONPolygonGeo,
  lineStringGeoUnconformed,
  lineStringGeoWrong,
  polygonGeoClosed,
  polygonGeoUnconformed,
  polygonGeoWrong
} from './input/geometry.js'

describe('isClosed()', async () => {
  it(`should return false on LineString`, () => {
    expect(isClosed(lineStringGeo)).to.be.false
  })
  it(`should return false on Ring`, () => {
    expect(isClosed(ringGeo)).to.be.false
  })
  it(`should return true on closed Ring`, () => {
    expect(isClosed(ringGeoClosed)).to.be.true
  })
})

describe('isPosition()', async () => {
  it(`should return true on Position`, () => {
    expect(isPosition(positionGeo)).to.be.true
  })
  it(`should return false on LineString`, () => {
    expect(isPosition(lineStringGeo)).to.be.false
  })
  it(`should return false on Polygon`, () => {
    expect(isPosition(polygonGeo)).to.be.false
  })
  it(`should return false on GeoJSON point`, () => {
    expect(isPosition(geoJSONPointGeo)).to.be.false
  })
  it(`should return false on GeoJSON lineString`, () => {
    expect(isPosition(geoJSONLineStringGeo)).to.be.false
  })
  it(`should return false on GeoJSON polygon`, () => {
    expect(isPosition(geoJSONPolygonGeo)).to.be.false
  })
})

describe('isLineString()', async () => {
  it(`should return false on Position`, () => {
    expect(isLineString(positionGeo)).to.be.false
  })
  it(`should return true on LineString`, () => {
    expect(isLineString(lineStringGeo)).to.be.true
  })
  // it(`should return false on closed Ring`, () => {
  //   expect(isLineString(ringGeoClosed)).to.be.false
  // })
  it(`should return false on Polygon`, () => {
    expect(isLineString(polygonGeo)).to.be.false
  })
  it(`should return false on GeoJSON point`, () => {
    expect(isLineString(geoJSONPointGeo)).to.be.false
  })
  it(`should return false on GeoJSON lineString`, () => {
    expect(isLineString(geoJSONLineStringGeo)).to.be.false
  })
  it(`should return false on GeoJSON polygon`, () => {
    expect(isLineString(geoJSONPolygonGeo)).to.be.false
  })
})

describe('isPolygon()', async () => {
  it(`should return false on Position`, () => {
    expect(isPolygon(positionGeo)).to.be.false
  })
  it(`should return false on LineString`, () => {
    expect(isPolygon(lineStringGeo)).to.be.false
  })
  it(`should return true on Polygon`, () => {
    expect(isPolygon(polygonGeo)).to.be.true
  })
  // it(`should return false on closed Polygon`, () => {
  //   expect(isPolygon(polygonGeoClosed)).to.be.false
  // })
  it(`should return false on GeoJSON point`, () => {
    expect(isPolygon(geoJSONPointGeo)).to.be.false
  })
  it(`should return false on GeoJSON lineString`, () => {
    expect(isPolygon(geoJSONLineStringGeo)).to.be.false
  })
  it(`should return false on GeoJSON polygon`, () => {
    expect(isPolygon(geoJSONPolygonGeo)).to.be.false
  })
})

describe('isGeoJSONPoint()', async () => {
  it(`should return false on Position`, () => {
    expect(isGeoJSONPoint(positionGeo)).to.be.false
  })
  it(`should return false on LineString`, () => {
    expect(isGeoJSONPoint(lineStringGeo)).to.be.false
  })
  it(`should return false on Polygon`, () => {
    expect(isGeoJSONPoint(polygonGeo)).to.be.false
  })
  it(`should return true on GeoJSON Point`, () => {
    expect(isGeoJSONPoint(geoJSONPointGeo)).to.be.true
  })
  it(`should return false on GeoJSON LineString`, () => {
    expect(isGeoJSONPoint(geoJSONLineStringGeo)).to.be.false
  })
  it(`should return false on GeoJSON Polygon`, () => {
    expect(isGeoJSONPoint(geoJSONPolygonGeo)).to.be.false
  })
})

describe('isGeoJSONLineString()', async () => {
  it(`should return false on Position`, () => {
    expect(isGeoJSONLineString(positionGeo)).to.be.false
  })
  it(`should return false on LineString`, () => {
    expect(isGeoJSONLineString(lineStringGeo)).to.be.false
  })
  it(`should return false on Polygon`, () => {
    expect(isGeoJSONLineString(polygonGeo)).to.be.false
  })
  it(`should return false on GeoJSON Point`, () => {
    expect(isGeoJSONLineString(geoJSONPointGeo)).to.be.false
  })
  it(`should return true on GeoJSON LineString`, () => {
    expect(isGeoJSONLineString(geoJSONLineStringGeo)).to.be.true
  })
  it(`should return false on GeoJSON Polygon`, () => {
    expect(isGeoJSONLineString(geoJSONPolygonGeo)).to.be.false
  })
})

describe('isGeoJSONPolygon()', async () => {
  it(`should return false on Position`, () => {
    expect(isGeoJSONPolygon(positionGeo)).to.be.false
  })
  it(`should return false on LineString`, () => {
    expect(isGeoJSONPolygon(lineStringGeo)).to.be.false
  })
  it(`should return false on Polygon`, () => {
    expect(isGeoJSONPolygon(polygonGeo)).to.be.false
  })
  it(`should return false on GeoJSON Point`, () => {
    expect(isGeoJSONPolygon(geoJSONPointGeo)).to.be.false
  })
  it(`should return false on GeoJSON LineString`, () => {
    expect(isGeoJSONPolygon(geoJSONLineStringGeo)).to.be.false
  })
  it(`should return true on GeoJSON Polygon`, () => {
    expect(isGeoJSONPolygon(geoJSONPolygonGeo)).to.be.true
  })
})

describe('conformLineString()', async () => {
  it(`should remove duplicate point`, () => {
    expect(conformLineString(lineStringGeoUnconformed)).to.deep.equal(
      lineStringGeo
    )
  })
  it(`should throw when not enough points`, () => {
    expect(() => conformLineString(lineStringGeoWrong)).to.throw()
  })
  it(`should not throw when enough points`, () => {
    expect(() => conformLineString(lineStringGeo)).to.not.throw()
  })
})

describe('conformPolygon()', async () => {
  it(`should remove duplicate point and unclose`, () => {
    expect(conformPolygon(polygonGeoUnconformed)).to.deep.equal(polygonGeo)
  })
  it(`should throw when not enough points`, () => {
    expect(() => conformPolygon(polygonGeoWrong)).to.throw()
  })
  it(`should not throw when enough points`, () => {
    expect(() => conformPolygon(polygonGeo)).to.not.throw()
  })
})

describe('convertGeoJSONPolygonToPolygon()', async () => {
  it(`should not close`, () => {
    expect(convertGeoJSONPolygonToPolygon(geoJSONPolygonGeo)).to.deep.equal(
      polygonGeo
    )
  })
})

describe('convertGeoJSONPolygonToPolygon()', async () => {
  it(`should close when asked`, () => {
    expect(
      convertGeoJSONPolygonToPolygon(geoJSONPolygonGeo, true)
    ).to.deep.equal(polygonGeoClosed)
  })
})

describe('convertPolygonToGeoJSONPolygon()', async () => {
  it(`should respect GeoJSON spec`, () => {
    expect(convertPolygonToGeoJSONPolygon(polygonGeo)).to.deep.equal(
      geoJSONPolygonGeo
    )
  })
})
