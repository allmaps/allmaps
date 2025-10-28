import { describe, expect, test } from 'vitest'

import { execString } from './lib/exec.js'

describe('allmaps id', () => {
  const url = 'https://digital.zlb.de/viewer/api/v1/records/34231682/manifest/'
  const expectedId = '6f5a7b547c8f6fbe'

  test('should read a URL and ganerate its Allmaps ID', () => {
    const output = execString(`id ${url}`)
    expect(expectedId).to.equal(output)
  })

  test('should read a URL from the standard input and generate its Allmaps ID', () => {
    const output = execString('id', url)
    expect(expectedId).to.equal(output)
  })
})
