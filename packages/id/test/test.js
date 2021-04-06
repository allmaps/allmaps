const id = require('../index')
const test = require('tape')

test('Create id for url: 1234', (t) => {
  const str = id(1234)
  t.equal(str.length, 16, 'Worked as expected ' + str)
  t.equal(str, '1ARVn2Auq2WAqx2g', 'id is consistent. 1234 >> 1ARVn2Auq2WAqx2g')
  t.end()
})

test('Confirm string characters are in allowed chars', (t) => {
  const charSet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789'
  const str = id(Math.random())
  console.log('Our Random string is: ' + str)

  let char
  str.split('').map((c) => {
    char = c
  })

  t.true(charSet.indexOf(char) > -1, char + ' is in charSet: ' + charSet)
  t.end()
})

test('Full Length Hash', (t) => {
  const hash = id('RandomGobbledygook', 50)
  t.true(hash.length > 20, 'Full Length is ' + hash)
  t.end()
})
