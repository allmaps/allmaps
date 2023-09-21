import { describe, it } from 'mocha'

import { computeBBox } from '../dist/bbox.js'
import { lineStringGeo, lineStringGeoBBox } from './input/geometry.js'
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'

describe('computeBBox()', async () => {
  it(`should return a correct BBox`, () => {
    expectToBeCloseToArray(computeBBox(lineStringGeo), lineStringGeoBBox)
  })
  it(`should return the same BBox for a polygon or it's ring`, () => {
    expectToBeCloseToArray(
      computeBBox(lineStringGeo),
      computeBBox([lineStringGeo])
    )
  })
})
