import { describe, test, expect } from 'vitest'

import { Viewport } from '../src/viewport/Viewport.js'

import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'
import { HALF_SIZE } from '../src/shared/web-mercator.js'

const WORLD_WIDTH = 2 * HALF_SIZE

const defaultViewportSize: [number, number] = [800, 600]

const originCenter: [number, number] = [0, 0]
const leftEdgeCenter: [number, number] = [-HALF_SIZE, 0]
const rightEdgeCenter: [number, number] = [HALF_SIZE, 0]
const pastAntiMeridianCenter: [number, number] = [HALF_SIZE + 1000000, 0]
const utmCenter: [number, number] = [500000, 5000000]

// Scale where viewport width covers exactly one world
const singleWorldScale = WORLD_WIDTH / defaultViewportSize[0] / 2
// Scale where viewport width covers two worlds
const multiWorldScale = WORLD_WIDTH * 2 / defaultViewportSize[0]

const utmProjection = {
  name: 'UTM Zone 32N',
  definition: '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs'
}

describe('Viewport world wrapping', () => {
  describe('Web Mercator projection', () => {
    test('should have worldWidth equal to full Web Mercator extent', () => {
      const viewport = new Viewport(defaultViewportSize, originCenter, singleWorldScale)
      expect(viewport.worldWidth).to.be.approximately(WORLD_WIDTH, 1)
    })

    test('should have startWorld=0 and endWorld=1 for a viewport in the primary world', () => {
      const viewport = new Viewport(defaultViewportSize, originCenter, singleWorldScale)
      expect(viewport.startWorld).to.equal(0)
      expect(viewport.endWorld).to.equal(1)
    })

    test('should have startWorld=-1 when viewport extends past the left edge of the primary world', () => {
      const viewport = new Viewport(defaultViewportSize, leftEdgeCenter, singleWorldScale)
      expect(viewport.startWorld).to.equal(-1)
      expect(viewport.endWorld).to.equal(1)
    })

    test('should have endWorld=2 when viewport extends past the right edge of the primary world', () => {
      const viewport = new Viewport(defaultViewportSize, rightEdgeCenter, singleWorldScale)
      expect(viewport.startWorld).to.equal(0)
      expect(viewport.endWorld).to.equal(2)
    })

    test('should still reach endWorld=2 when centered just inside the right edge', () => {
      const justInsideRight: [number, number] = [HALF_SIZE - 1, 0]
      const viewport = new Viewport(defaultViewportSize, justInsideRight, singleWorldScale)
      expect(viewport.endWorld).to.equal(2)
    })

    test('should report 3 world copies when viewport width equals two full world widths', () => {
      const viewport = new Viewport(defaultViewportSize, originCenter, multiWorldScale)
      expect(viewport.endWorld - viewport.startWorld).to.equal(3)
    })

    test('should produce valid geoRectangle coordinates within [-180, 180] longitude', () => {
      const viewport = new Viewport(defaultViewportSize, pastAntiMeridianCenter, singleWorldScale)
      for (const point of viewport.geoRectangle) {
        expect(point[0]).to.be.greaterThanOrEqual(-180)
        expect(point[0]).to.be.lessThanOrEqual(180)
      }
    })

    test('should produce valid geoRectangle for a viewport in the primary world', () => {
      const viewport = new Viewport(defaultViewportSize, originCenter, singleWorldScale)
      for (const point of viewport.geoRectangle) {
        expect(point[0]).to.be.greaterThanOrEqual(-180)
        expect(point[0]).to.be.lessThanOrEqual(180)
        expect(point[1]).to.be.greaterThanOrEqual(-90)
        expect(point[1]).to.be.lessThanOrEqual(90)
      }
    })

    test('geoCenter should be near [0, 0] for a viewport centered at the origin', () => {
      const viewport = new Viewport(defaultViewportSize, originCenter, singleWorldScale)
      expectToBeCloseToArray(viewport.geoCenter, [0, 0], 1e-6)
    })

    test('geoRectangle longitudes should not span more than 360 degrees when crossing the anti-meridian', () => {
      const viewport = new Viewport(defaultViewportSize, pastAntiMeridianCenter, singleWorldScale)
      const lons = viewport.geoRectangle.map(p => p[0])
      const lonRange = Math.max(...lons) - Math.min(...lons)
      expect(lonRange).to.be.lessThan(360)
    })
  })

  describe('Non-Mercator projection', () => {
    test('should have worldWidth=0 for a non-wrapping projection', () => {
      const viewport = new Viewport(defaultViewportSize, utmCenter, singleWorldScale, {
        projection: utmProjection,
        rotation: 0,
        devicePixelRatio: 1
      })
      expect(viewport.worldWidth).to.equal(0)
    })

    test('should have startWorld=0 and endWorld=1 for a non-wrapping projection', () => {
      const viewport = new Viewport(defaultViewportSize, utmCenter, singleWorldScale, {
        projection: utmProjection,
        rotation: 0,
        devicePixelRatio: 1
      })
      expect(viewport.startWorld).to.equal(0)
      expect(viewport.endWorld).to.equal(1)
    })
  })

  describe('getProjectedGeoBufferedRectangle', () => {
    test('should return wrapped coordinates within the primary world when past the anti-meridian', () => {
      const viewport = new Viewport(defaultViewportSize, pastAntiMeridianCenter, singleWorldScale)
      const rect = viewport.getProjectedGeoBufferedRectangle(0)
      for (const point of rect) {
        expect(point[0]).to.be.greaterThanOrEqual(-HALF_SIZE)
        expect(point[0]).to.be.lessThanOrEqual(HALF_SIZE)
      }
    })

    test('should return coordinates within the primary world for a centered viewport', () => {
      const viewport = new Viewport(defaultViewportSize, originCenter, singleWorldScale)
      const rect = viewport.getProjectedGeoBufferedRectangle(0)
      for (const point of rect) {
        expect(point[0]).to.be.greaterThanOrEqual(-HALF_SIZE)
        expect(point[0]).to.be.lessThanOrEqual(HALF_SIZE)
      }
    })
  })
})
