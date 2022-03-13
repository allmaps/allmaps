import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import { parseAnnotation, generateAnnotation } from '../index.js'

chai.use(shallowDeepEqual)

const inputDir = './test/input'
const outputDir = './test/output'

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

    const {
      groups: { type }
    } = /(?<type>\w+)\.(?<id>.+)/.exec(basename)

    if (!['annotation', 'map'].includes(type)) {
      throw new Error(`${basename}: invalid type`)
    }

    const parsedType = type === 'annotation' ? 'map' : 'annotation'

    const inputFilename = `${inputDir}/${basename}.json`
    const outputFilename = `${outputDir}/${basename}.${parsedType}.json`
    const errorsFilename = `${outputDir}/${basename}.errors.json`

    const input = readJSONFile(inputFilename)

    let output
    let errors

    try {
      if (type === 'map') {
        output = generateAnnotation(input)
      } else if (type === 'annotation') {
        output = parseAnnotation(input)
      }
    } catch (err) {
      // TODO: include other AJV error data?
      if (err.errors) {
        errors = err.errors.map((error) => error.message)
      } else {
        errors = [err.message]
      }
    }

    return {
      type,
      basename,
      input,
      output,
      errors,
      expected: {
        output: readJSONFile(outputFilename),
        errors: readJSONFile(errorsFilename)
      }
    }
  })
  .forEach(runTests)

function runTests(file) {
  describe(file.basename, () => {
    if (file.output && file.expected.output) {
      it('should match expected output', () => {
        expect(file.expected.output).to.shallowDeepEqual(file.output)
      })
    } else if (file.errors && file.expected.errors) {
      // TODO: test line numbers with json-source-map?

      it('should result in the correct error message', () => {
        expect(file.expected.errors.sort()).to.deep.equal(file.errors.sort())
      })
    } else if (file.output && file.expected.errors) {
      console.error('File parsed correctly, but expected errors:', file.basename)
      console.log(file.output)
    } else if (file.errors && file.expected.output) {
      console.error('File failed to parse:', file.basename)
      console.log(file.errors)
    } else {
      console.error(
        'Input file should have either matching output or errors JSON file:\n  ',
        file.basename
      )
    }
  })
}
