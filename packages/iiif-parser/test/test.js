/* global import */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import Ajv from 'ajv'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import * as allmaps from '../index.js'
import { parseIiif, getTilesets } from '../index.js'

chai.use(shallowDeepEqual)

const inputDir = './test/input'
const parsedDir = './test/parsed'
const tilesDir = './test/tiles'
const schemasDir = './schemas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Expected output of other functions than parseIiif and getTiles is found in this JSON file:
const functionOutput = readJSONFile(path.join(__dirname, 'function-output.json'))

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
    const parsedFilename = `${parsedDir}/${basename}.parsed.json`
    const tilesFilename = `${tilesDir}/${basename}.tiles.json`
    const errorFilename = `${parsedDir}/${basename}.error.json`

    const input = readJSONFile(inputFilename)

    let parseOutput
    let parseError

    try {
      parseOutput = parseIiif(input, {
        includeSourceData: false
      })
    } catch (err) {
      parseError = err
    }

    return {
      basename,
      input,
      parsed: parseOutput,
      parseError,
      expected: {
        parsed: readJSONFile(parsedFilename),
        tiles: readJSONFile(tilesFilename),
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
  describe(`Parsing ${file.basename}`, () => {
    if (file.expected.parsed || file.expected.error !== undefined) {
      if (file.parsed) {
        it('should result in output which is valid according to JSON Schema', () => {
          const valid = validate(file.parsed)
          if (!valid) {
            throw new Error(JSON.stringify(validate.errors))
          }
        })

        it('should match expected output', () => {
          expect(file.parsed).to.shallowDeepEqual(file.expected.parsed)
        })
      } else {
        it('should result in the correct error message', () => {
          expect(file.parseError.message).to.equal(file.expected.error)
        })
      }
    } else {
      console.error('Input IIIF file should have either matching parsed or error JSON file:\n  ', file.basename)
    }
  })

  if (file.parsed) {
    if (file.expected.tiles) {
      if (file.parsed.type !== 'image') {
        throw new Error('Only test getTiles output for images!')
      }

      describe(`Tiles for ${file.basename}`, () => {
        it('should match expected output', () => {
          let tilesetsOutput
          let tilesetsError

          try {
            tilesetsOutput = getTilesets(file.parsed)
          } catch (err) {
            tilesetsError = err
          }

          if (tilesetsOutput) {
            expect(tilesetsOutput).to.have.deep.members(file.expected.tiles)
          } else {
            expect(tilesetsError.message).to.equal(file.expected.tiles)
          }
        })
      })
    }

    if (functionOutput[file.basename]) {
      if (file.parsed.type !== 'image') {
        throw new Error('Only test function output for images!')
      }

      describe(`Functions for ${file.basename}`, () => {
        for (const [fn, tests] of Object.entries(functionOutput[file.basename])) {
          describe(`${fn}`, () => {
            for (const { input, output: expectedOutput } of tests) {
              it('should match expected output', () => {
                let fnOutput
                let fnError

                try {
                  fnOutput = allmaps[fn](file.parsed, ...input)
                } catch (err) {
                  fnError = err
                }

                if (fnOutput) {
                  expect(fnOutput).to.deep.equal(expectedOutput)
                } else {
                  expect(fnError.message).to.equal(expectedOutput)
                }
              })
            }
          })
        }
      })
    }
  }
}
