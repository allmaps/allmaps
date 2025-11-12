import { describe, test } from 'vitest'

import { computeBbox } from '../src/bbox.js'
import { lineStringGeo, lineStringGeoBbox } from './input/geometry.js'

// TODO: move to test helper file in /test/
import { expectToBeCloseToArray } from '../../stdlib/test/helper-functions.js'

describe('computeBbox()', async () => {
  test(`should return a correct Bbox`, () => {
    expectToBeCloseToArray(computeBbox(lineStringGeo), lineStringGeoBbox)
  })
  test(`should return the same Bbox for a polygon or its ring`, () => {
    expectToBeCloseToArray(
      computeBbox(lineStringGeo),
      computeBbox([lineStringGeo])
    )
  })
})
