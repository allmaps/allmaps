import { describe, it } from 'mocha'

import { computeBbox } from '../dist/bbox.js'
import { lineStringGeo, lineStringGeoBbox } from './input/geometry.js'
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'

describe('computeBbox()', async () => {
  it(`should return a correct BBox`, () => {
    expectToBeCloseToArray(computeBbox(lineStringGeo), lineStringGeoBbox)
  })
  it(`should return the same BBox for a polygon or it's ring`, () => {
    expectToBeCloseToArray(
      computeBbox(lineStringGeo),
      computeBbox([lineStringGeo])
    )
  })
})
