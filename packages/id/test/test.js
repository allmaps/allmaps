import test from 'tape'

import { createId, createRandomId, createChecksum } from '../nodejs.js'

test('Create ID for url: 1234', async (t) => {
  const id = await createId(1234)
  t.equal(id.length, 16, 'Worked as expected ' + id)
  t.equal(id, '1ARVn2Auq2WAqx2g', 'id is consistent. 1234 >> 1ARVn2Auq2WAqx2g')
  t.end()
})

test('Confirm string characters are in allowed chars', async (t) => {
  const charSet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789'
  const id = await createId(Math.random())
  console.log('Our Random string is: ' + id)

  let char
  id.split('').map((c) => {
    char = c
  })

  t.true(charSet.indexOf(char) > -1, char + ' is in charSet: ' + charSet)
  t.end()
})

test('Create random IDs', async (t) => {
  const id1 = await createRandomId()
  const id2 = await createRandomId()
  t.equal(id1.length, 16, 'Worked as expected ' + id1)
  t.notEqual(id1, id2, 'IDs are different')
  t.end()
})

test('Full Length Hash', async (t) => {
  const id = await createId('qwertyuiopasdfghjklzxcvbnm', 50)
  t.true(id.length > 20, 'Full Length is ' + id)
  t.end()
})

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

test('Object checksum', async (t) => {
  const checksum = await createChecksum(obj1)
  t.equal(checksum.length, 16, 'Worked as expected ' + checksum)
  t.equal(checksum, 'f2XwC5sWfSCWd9mJ', 'checksum is correct')
  t.end()
})

test('Semantically equal objects produce equal checksums', async (t) => {
  const checksum1 = await createChecksum(obj1)
  const checksum2 = await createChecksum(obj2)
  t.equal(checksum1, checksum2, 'checksums are equal')
  t.end()
})
