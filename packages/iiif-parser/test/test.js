import fs from 'fs'
import path from 'path'

import Ajv from 'ajv'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import { parseIiif, getTiles, getImageUrl, getThumbnail } from '../index.js'

chai.use(shallowDeepEqual)

const inputDir = './test/input'
const expectedDir = './test/expected'
const schemasDir = './schemas'

const schemas = {
  iiif: readJSONFile(`${schemasDir}/iiif.json`),
  image: readJSONFile(`${schemasDir}/image.json`),
  presentation: readJSONFile(`${schemasDir}/manifest.json`),
  collection: readJSONFile(`${schemasDir}/collection.json`)
}

const ajv = new Ajv({
  schemas: Object.values(schemas)
})

const validate = ajv.getSchema('https://allmaps.org/iiif-parser/schemas/iiif.json')

fs.readdirSync(inputDir)
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => {
    const basename = path.basename(filename, '.json')

    const inputFilename = `${inputDir}/${basename}.json`
    const parsedFilename = `${expectedDir}/${basename}.parsed.json`
    const errorFilename = `${expectedDir}/${basename}.error.json`

    const input = readJSONFile(inputFilename)

    let parsed
    let parseError

    try {
      parsed = parseIiif(input, {
        includeSourceData: false
      })
    } catch (err) {
      parseError = err
    }

    return {
      basename,
      input,
      parsed,
      parseError,
      expected: {
        parsed: readJSONFile(parsedFilename),
        error: readJSONFile(errorFilename)
      }
    }
  })
  .forEach(runTests)

function readJSONFile (filename) {
  try {
    return JSON.parse(fs.readFileSync(filename))
  } catch (err) {
    return undefined
  }
}

function runTests (file) {
  describe(`Parsing ${file.basename}`, function () {
    if (file.expected.parsed || file.expected.error) {
      if (file.parsed) {
        it('should result in output which is valid according to JSON Schema', function () {
          const valid = validate(file.parsed)
          if (!valid) {
            console.log(file.parsed)
            throw new Error(JSON.stringify(validate.errors))
          }
        })

        it('should match expected output', function () {
          expect(file.parsed).to.shallowDeepEqual(file.expected.parsed)
        })
      } else {
        it('should result in the correct error message', function () {
          expect(file.parseError.message).to.equal(file.expected.error)
        })
      }
    } else {
      it('Input IIIF file should have either matching parsed or error JSON file', function () {
        throw new Error('File not found')
      })
    }
  })

  // if (file.parsed) {
  //   if (file.parsed.type === 'image') {
  //     getTiles(file.parsed)
  //   } else if (file.parsed.type === 'manifest') {
  //     file.parsed.images.map(getTiles)
  //   }
  // }
}
