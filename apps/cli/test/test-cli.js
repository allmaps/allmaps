import { expect } from 'chai'
import 'mocha'

import { exec } from './lib/exec.js'
import { helpMessage } from './lib/help.js'

describe('allmaps', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec()).to.throw(
      helpMessage(
        'cli'
      )
    )
  })
})
