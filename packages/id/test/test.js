import { describe, it } from 'mocha'
import { expect } from 'chai'

import { generateId, generateRandomId, generateChecksum } from '../dist/index.js'

const DEFAULT_LENGTH = 16

describe('generate ID for string "1234"', async () => {
  const id = await generateId(1234)

  it(`ID should be ${DEFAULT_LENGTH} characters long`, () => {
    expect(id.length).to.equal(DEFAULT_LENGTH)
  })

  const expectedId = 'd404559f602eab6f'
  it(`ID should equal "${expectedId}"`, () => {
    expect(id).to.equal(expectedId)
  })
})

const iiifUrl = 'https://polona.pl/iiif/item/NTU5NTE4OTg/manifest.json'
describe(`generate ID for URL "${iiifUrl}"`, async () => {
  const id = await generateId(iiifUrl)

  const expectedId = '4ac2770ae8624e38'
  it(`ID should equal "${expectedId}"`, () => {
    expect(id).to.equal(expectedId)
  })
})

describe('generate random IDs', async () => {
  const id1 = await generateRandomId()
  const id2 = await generateRandomId()

  it(`IDs should be ${DEFAULT_LENGTH} characters long`, () => {
    expect(id1.length).to.equal(DEFAULT_LENGTH)
    expect(id2.length).to.equal(DEFAULT_LENGTH)
  })

  it('IDs should be different', () => {
    expect(id1).to.not.equal(id2)
  })
})

const length = 50
describe(`ID of length ${length}`, async () => {
  const id = await generateId('qwertyuiopasdfghjklzxcvbnm', length)

  it(`ID should have length ${length}`, () => {
    expect(id.length).to.equal(length)
  })
})

describe('Object checksum', async () => {
  const obj1 = {
    a: 1,
    b: 2,
    c: [1, 2, 3, 4, 5]
  }

  const obj2 = {
    c: [1, 2, 3, 4, 5],
    b: 2,
    a: 1
  }

  const checksum1 = await generateChecksum(obj1)
  const checksum2 = await generateChecksum(obj2)

  it(`Checksums should have length ${DEFAULT_LENGTH}`, () => {
    expect(checksum1.length).to.equal(DEFAULT_LENGTH)
    expect(checksum2.length).to.equal(DEFAULT_LENGTH)
  })

  it('Checksum should be correct', () => {
    expect(checksum1).to.equal('7f65f00b9b1621f4')
  })

  it('Semantically equal objects produce equal checksums', () => {
    expect(checksum1).to.equal(checksum2)
  })
})
