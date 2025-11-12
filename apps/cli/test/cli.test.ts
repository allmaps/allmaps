import { describe, expect, test } from 'vitest'

import { execString } from './lib/exec.js'
import { helpMessage } from './lib/help.js'

describe('allmaps', () => {
  test('should display help when no arguments are provided', () => {
    expect(() => execString('')).to.throw(helpMessage('cli'))
  })
})
