import { describe, test } from 'vitest'

import { polygonSelfIntersectionPoints } from '../src/self-intersect.js'
import { expectToBeCloseToArrayArray } from './helper-functions.js'

import type { Polygon } from '@allmaps/types'

describe('polygonSelfIntersection()', () => {
  const nonSelfIntersectingPolygon: Polygon = [
    [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2]
    ]
  ]

  const selfIntersectingPolygon: Polygon = [
    [
      [0, 0],
      [1, 3],
      [2, 0],
      [2, 2],
      [0, 2]
    ]
  ]

  test(`should return an empty array for a non-self-intersecting polygon`, () => {
    expectToBeCloseToArrayArray(
      polygonSelfIntersectionPoints(nonSelfIntersectingPolygon),
      []
    )
  })

  test(`should return an array with unique self-intersections for a self-intersecting polygon`, () => {
    expectToBeCloseToArrayArray(
      polygonSelfIntersectionPoints(selfIntersectingPolygon),
      [
        [0.6666666666666666, 2],
        [1.3333333333333333, 2]
      ]
    )
  })
})
