import { describe, it } from 'mocha'

import { computeBbox } from '../dist/bbox.js'
import { lineStringGeo, lineStringGeoBbox } from './input/geometry.js'
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'

describe('computeBbox()', async () => {
  it(`should return a correct Bbox`, () => {
    expectToBeCloseToArray(computeBbox(lineStringGeo), lineStringGeoBbox)
  })
  it(`should return the same Bbox for a polygon or its ring`, () => {
    expectToBeCloseToArray(
      computeBbox(lineStringGeo),
      computeBbox([lineStringGeo])
    )
  })
})
