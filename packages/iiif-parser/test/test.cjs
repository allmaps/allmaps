const { expect } = require('chai')

const allmaps = require('../dist/cjs/index.js')

const expectedKeys = [
  'getIiifTile',
  'getImageUrl',
  'getThumbnail',
  'getTilesets',
  'parseIiif',
  'parseProfileUri'
]

expect(allmaps).to.have.all.keys(expectedKeys)
