import fs from 'fs'
import path from 'path'

import { zodToJsonSchema } from 'zod-to-json-schema'

import image2 from './src/schemas/iiif/image.2.js/index.js'

const inputDir = './test/input'

function readJSONFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename))
  } catch (err) {
    return undefined
  }
}

fs.readdirSync(inputDir)
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => {
    const basename = path.basename(filename, '.json')
    const inputFilename = `${inputDir}/${basename}.json`

    const input = readJSONFile(inputFilename)

    if (filename.endsWith('.image.2.json')) {
      console.log(filename)
      const iiifData = image2.parse(input)
      console.log(iiifData)
    }
  })

console.log(JSON.stringify(zodToJsonSchema(image2), null, 2))
