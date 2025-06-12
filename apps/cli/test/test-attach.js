import { describe, it } from 'mocha'
import { expect } from 'chai'

import { readFileJson } from './lib/fs.js'
import { execJson } from './lib/exec.js'

describe('allmaps attach', () => {
  it('should read annotations and RCPs', () => {
    const expected = readFileJson(
      'output/annotations/83d44a0b956681b0-3b72f58c723da9c4-bb4029969eeff948-5cf13f6681d355e3.json'
    )
    const output = execJson(
      'attach -r input/rcps/rcps.json',
      'input/annotations/83d44a0b956681b0-3b72f58c723da9c4-bb4029969eeff948-5cf13f6681d355e3.json'
    )
    expect(expected).to.deep.equal(output)
  })
})
