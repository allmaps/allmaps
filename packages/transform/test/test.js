const createTransformer = require('../index.js')

const gcps = require('./gcps.json')

const transformer = createTransformer(gcps)

const pixels = [
  [7000, 7000]
]

const points = transformer.toWorld(pixels)
const inverse = transformer.toPixels(points)

console.log('From:\n', pixels)
console.log('To:\n', JSON.stringify(points))
console.log('And back:\n', inverse)
