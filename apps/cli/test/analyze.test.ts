import { describe, expect, test } from 'vitest'

import { readFile } from './lib/fs.js'
import { execFilename } from './lib/exec.js'

describe('allmaps analyze', () => {
  test('should analyze annotations', () => {
    const expected = readFile('output/analyze/13fd7a1921f2b011.txt')
    const output = execFilename(
      'analyze',
      'input/annotations/13fd7a1921f2b011.json'
    )
    expect(expected).to.deep.equal(output)
  })
})
