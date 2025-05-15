import { describe, it } from 'mocha'
import { expect } from 'chai'

import { newBlockArrayMatrix } from '../dist/matrix.js'
import { expectToBeCloseToArrayArray } from './helper-functions.js'

describe('newBlockArrayMatrix', async () => {
  const block1 = [
    [1, 2],
    [3, 4]
  ]
  const block2 = [[5], [6]]
  const block3 = [[7, 8]]
  const block4 = [[9]]

  const blocks = [
    [block1, block2],
    [block3, block4]
  ]
  const wrongBlocks = [
    [block1, block3],
    [block2, block4]
  ]
  it(`should merge the blocks to a new array matrix if the sizes line up`, () => {
    expectToBeCloseToArrayArray(newBlockArrayMatrix(blocks), [
      [1, 2, 5],
      [3, 4, 6],
      [7, 8, 9]
    ])
  })

  it(`should throw if the sizes don't line up`, () => {
    expect(() => newBlockArrayMatrix(wrongBlocks)).to.throw()
  })
})
