import { describe, it } from 'mocha'

import { polygonSelfIntersectionPoints } from '../dist/self-intersect.js'
import { expectToBeCloseToArrayArray } from './helper-functions.js'

describe('polygonSelfIntersection()', async () => {
  const nonSelfIntersectingPolygon = [
    [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2]
    ]
  ]

  const selfIntersectingPolygon = [
    [
      [0, 0],
      [1, 3],
      [2, 0],
      [2, 2],
      [0, 2]
    ]
  ]

  it(`should return an empty array for a non-self-intersecting polygon`, () => {
    expectToBeCloseToArrayArray(
      polygonSelfIntersectionPoints(nonSelfIntersectingPolygon),
      []
    )
  })

  it(`should return an array with unique self-intersections for a self-intersecting polygon`, () => {
    expectToBeCloseToArrayArray(
      polygonSelfIntersectionPoints(selfIntersectingPolygon),
      [
        [0.6666666666666666, 2],
        [1.3333333333333333, 2]
      ]
    )
  })
})
