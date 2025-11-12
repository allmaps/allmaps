import { describe, expect, test } from 'vitest'

import { readFileJson } from './lib/fs.js'
import { execJson } from './lib/exec.js'

describe('allmaps attach', () => {
  test('should read annotations and RCPs', () => {
    const expected = readFileJson(
      'output/annotations/dd1d72e15acb3c12-5192fab48da28d89.json'
    )
    const output = execJson(
      'attach -r input/rcps/dd1d72e15acb3c12-5192fab48da28d89.json',
      'input/annotations/dd1d72e15acb3c12-5192fab48da28d89.json'
    )
    expect(expected).to.deep.equal(output)
  })

  test('should read annotations and RCPs and be able to remove existing gcps', () => {
    const expected = readFileJson(
      'output/annotations/83d44a0b956681b0-3b72f58c723da9c4-bb4029969eeff948-5cf13f6681d355e3.json'
    )
    const output = execJson(
      'attach -r input/rcps/83d44a0b956681b0-3b72f58c723da9c4-bb4029969eeff948-5cf13f6681d355e3.json --remove-existing-gcps',
      'input/annotations/83d44a0b956681b0-3b72f58c723da9c4-bb4029969eeff948-5cf13f6681d355e3.json'
    )
    expect(expected).toRoughlyEqual(output, 0.00000000001)
  })
})
