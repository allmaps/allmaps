import fs from 'fs'
import path from 'path'
import { z } from 'zod'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import { IIIF } from '../dist/index.js'
// import { IIIFSchema } from '../dist/schemas/iiif.js'

chai.use(shallowDeepEqual)

const inputDir = './test/input'
const outputDir = './test/output'

fs.readdirSync(inputDir)
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => {
    const basename = path.basename(filename, '.json')

    const inputFilename = path.join(inputDir, `${basename}.json`)
    const parsedFilename = path.join(outputDir, `${basename}.parsed.json`)
    const errorFilename = path.join(outputDir, `${basename}.error.json`)

    const input = readJSONFile(inputFilename)

    let output
    let parsedIiif
    let errors
    let zodError

    if (
      basename === 'manifest.2.princeton-fa4fb452-5f1d-42ab-a471-53afc176c948'
    ) {
      console.log('vis')
      const parsed = IIIF.parse(input)
      console.log({ ...parsed })
      console.log('HONDEN')
    }

    try {
      parsedIiif = IIIF.parse(input)
      output = { ...parsedIiif }
    } catch (err) {
      if (err.errors) {
        errors = err.errors.map((error) => error.message)
      } else {
        errors = [err.message]
      }

      if (err instanceof z.ZodError) {
        zodError = err
      }
    }

    return {
      basename,
      input,
      parsedIiif,
      output,
      errors,
      zodError,
      expected: {
        output: readJSONFile(parsedFilename),
        errors: readJSONFile(errorFilename)
      }
    }
  })
  .forEach(runTests)

export function readJSONFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename))
  } catch (err) {
    return undefined
  }
}

function runTests(file) {
  describe(`Parsing ${file.basename}`, () => {
    if (file.output && file.expected.output) {
      it('should match expected output', () => {
        expect(file.expected.output).to.shallowDeepEqual(file.output)
      })

      console.log(file.basename)
      console.log(JSON.stringify(file.output))
    } else if (file.errors && file.expected.errors) {
      it('should result in the correct error message', () => {
        expect(file.expected.errors.sort()).to.deep.equal(file.errors.sort())
      })
    } else if (file.output && file.expected.errors) {
      console.log('File parsed correctly, but expected errors:', file.basename)
    } else if (file.errors && file.expected.output) {
      console.log(
        'File failed to parse, but expected no errors:',
        file.basename
      )

      console.log(file.errors)

      if (file.zodError) {
        console.error(JSON.stringify(file.zodError.format(), null, 2))
        console.error(file.zodError.issues)
      }
    } else {
      console.log(
        'Input file should have either matching output or errors JSON file:\n  ',
        file.basename
      )
    }
  })
}
