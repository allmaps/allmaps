import { describe, it } from 'mocha'
import { expect } from 'chai'

import { createId, createRandomId, createChecksum } from '../index.js'

const DEFAULT_LENGTH = 16

describe('Create ID for url "1234"', async () => {
  const id = await createId(1234)

  it(`ID should be ${DEFAULT_LENGTH} characters long`, () => {
    expect(id.length).to.equal(DEFAULT_LENGTH)
  })

  const expectedId = '1ARVn2Auq2WAqx2g'
  it(`ID should equal "${expectedId}"`, () => {
    expect(id).to.equal(expectedId)
  })
})

// test('Confirm string characters are in allowed chars', async (t) => {
//   const charSet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789'
//   const id = await createId(Math.random())
//   console.log('Our Random string is: ' + id)

//   let char
//   id.split('').map((c) => {
//     char = c
//   })

//   t.true(charSet.indexOf(char) > -1, char + ' is in charSet: ' + charSet)
//   t.end()
// })

describe('Create random IDs', async () => {
  const id1 = await createRandomId()
  const id2 = await createRandomId()

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
  const id = await createId('qwertyuiopasdfghjklzxcvbnm', length)

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

  const checksum1 = await createChecksum(obj1)
  const checksum2 = await createChecksum(obj2)

  it(`Checksums should have length ${DEFAULT_LENGTH}`, () => {
    expect(checksum1.length).to.equal(DEFAULT_LENGTH)
    expect(checksum2.length).to.equal(DEFAULT_LENGTH)
  })

  it('Checksum should be correct', () => {
    expect(checksum1).to.equal('f2XwC5sWfSCWd9mJ')
  })

  it('Semantically equal objects produce equal checksums', () => {
    expect(checksum1).to.equal(checksum2)
  })
})
